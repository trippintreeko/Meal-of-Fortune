-- Post-voting phase: get_voting_statistics, scheduled_group_meals, schedule_group_meals RPCs
-- See docs/VOTING-SESSION-ENHANCEMENT.md §11–20

-- 1. get_voting_statistics: for results page (participant count, per-suggestion stats)
CREATE OR REPLACE FUNCTION public.get_voting_statistics(p_session_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_id UUID;
  v_session voting_sessions%ROWTYPE;
  v_total_participants INT;
  v_total_votes INT;
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_my_id := public.get_my_profile_id();
  IF v_my_id IS NULL THEN
    RAISE EXCEPTION 'No profile found. Sign in again.';
  END IF;

  SELECT * INTO v_session FROM voting_sessions WHERE id = p_session_id LIMIT 1;
  IF v_session.id IS NULL THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  IF NOT (public.is_member_of_group(v_session.group_id)) THEN
    RAISE EXCEPTION 'Not a member of this group';
  END IF;

  SELECT COUNT(DISTINCT user_id)::INT INTO v_total_participants
  FROM votes WHERE session_id = p_session_id;

  SELECT COALESCE(SUM(vote_count), 0)::INT INTO v_total_votes
  FROM meal_suggestions WHERE session_id = p_session_id;

  v_result := jsonb_build_object(
    'total_participants', COALESCE(v_total_participants, 0),
    'total_votes', COALESCE(v_total_votes, 0),
    'winner_suggestion_id', v_session.winner_suggestion_id,
    'suggestions', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'suggestion_id', ms.id,
          'suggestion_text', ms.suggestion,
          'vote_count', COALESCE(ms.vote_count, 0),
          'percentage', ROUND(100.0 * COALESCE(ms.vote_count, 0) / NULLIF(v_total_votes, 0), 1),
          'suggested_by_user_id', ms.user_id,
          'suggested_by_username', p.username
        ) ORDER BY ms.vote_count DESC, ms.created_at
      ), '[]'::jsonb)
      FROM meal_suggestions ms
      LEFT JOIN profiles p ON p.id = ms.user_id
      WHERE ms.session_id = p_session_id
    )
  );

  RETURN v_result;
END;
$$;

-- 2. Extend voting_sessions for post-vote
ALTER TABLE voting_sessions ADD COLUMN IF NOT EXISTS results_published BOOLEAN DEFAULT FALSE;
ALTER TABLE voting_sessions ADD COLUMN IF NOT EXISTS schedule_published_at TIMESTAMPTZ;

-- 3. scheduled_group_meals table (admin-suggested/scheduled meals per member)
CREATE TABLE IF NOT EXISTS scheduled_group_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voting_session_id UUID NOT NULL REFERENCES voting_sessions(id) ON DELETE CASCADE,
  suggestion_id UUID NOT NULL REFERENCES meal_suggestions(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  meal_slot TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'scheduled')),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_by_admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(voting_session_id, user_id, scheduled_date, meal_slot)
);

CREATE INDEX IF NOT EXISTS idx_scheduled_group_meals_session ON scheduled_group_meals(voting_session_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_group_meals_user ON scheduled_group_meals(user_id);

-- RLS
ALTER TABLE scheduled_group_meals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own scheduled_group_meals" ON scheduled_group_meals
  FOR SELECT USING (user_id = public.get_my_profile_id());

CREATE POLICY "Admins can view group scheduled_group_meals" ON scheduled_group_meals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM voting_sessions vs
      JOIN group_members gm ON gm.group_id = vs.group_id
      WHERE vs.id = voting_session_id AND gm.user_id = public.get_my_profile_id() AND gm.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert scheduled_group_meals" ON scheduled_group_meals
  FOR INSERT WITH CHECK (created_by_admin_id = public.get_my_profile_id());

CREATE POLICY "Members can update own row (accept/decline)" ON scheduled_group_meals
  FOR UPDATE USING (user_id = public.get_my_profile_id());

-- 4. schedule_group_meals RPC (admin: create suggested or scheduled meals for group)
CREATE OR REPLACE FUNCTION public.schedule_group_meals(
  p_session_id UUID,
  p_schedule_data JSONB,
  p_send_as_suggestion BOOLEAN DEFAULT true,
  p_notify_members BOOLEAN DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_id UUID;
  v_session voting_sessions%ROWTYPE;
  v_item JSONB;
  v_date DATE;
  v_slot TEXT;
  v_suggestion_id UUID;
  v_member_id UUID;
  v_status TEXT;
  v_results jsonb := '[]'::jsonb;
  v_sgm_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_my_id := public.get_my_profile_id();
  IF v_my_id IS NULL THEN
    RAISE EXCEPTION 'No profile found. Sign in again.';
  END IF;

  SELECT * INTO v_session FROM voting_sessions WHERE id = p_session_id LIMIT 1;
  IF v_session.id IS NULL THEN
    RAISE EXCEPTION 'Session not found';
  END IF;
  IF v_session.status <> 'completed' THEN
    RAISE EXCEPTION 'Can only schedule meals for a completed vote';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = v_session.group_id AND user_id = v_my_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only a group admin can schedule for the group';
  END IF;

  v_status := CASE WHEN p_send_as_suggestion THEN 'pending' ELSE 'scheduled' END;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_schedule_data)
  LOOP
    v_date := (v_item->>'date')::DATE;
    v_slot := v_item->>'slot';
    v_suggestion_id := (v_item->>'suggestion_id')::UUID;
    IF v_date IS NULL OR v_slot IS NULL OR v_suggestion_id IS NULL THEN
      CONTINUE;
    END IF;

    FOR v_member_id IN
      SELECT gm.user_id FROM group_members gm
      WHERE gm.group_id = v_session.group_id AND gm.user_id <> v_my_id
    LOOP
      INSERT INTO scheduled_group_meals (
        voting_session_id, suggestion_id, scheduled_date, meal_slot, status, user_id, created_by_admin_id
      )
      VALUES (p_session_id, v_suggestion_id, v_date, v_slot, v_status, v_member_id, v_my_id)
      ON CONFLICT (voting_session_id, user_id, scheduled_date, meal_slot) DO UPDATE
      SET suggestion_id = EXCLUDED.suggestion_id, status = EXCLUDED.status
      RETURNING id INTO v_sgm_id;

      v_results := v_results || jsonb_build_object(
        'user_id', v_member_id,
        'scheduled_group_meal_id', v_sgm_id,
        'status', v_status
      );
    END LOOP;
  END LOOP;

  IF p_send_as_suggestion = FALSE THEN
    UPDATE voting_sessions SET schedule_published_at = NOW() WHERE id = p_session_id;
  END IF;

  RETURN jsonb_build_object('results', v_results);
END;
$$;

-- 5. accept_suggested_meal (member accepts → client adds to calendar)
CREATE OR REPLACE FUNCTION public.accept_suggested_meal(p_scheduled_group_meal_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_id UUID;
  v_sgm scheduled_group_meals%ROWTYPE;
  v_suggestion_text TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_my_id := public.get_my_profile_id();
  IF v_my_id IS NULL THEN
    RAISE EXCEPTION 'No profile found. Sign in again.';
  END IF;

  SELECT * INTO v_sgm FROM scheduled_group_meals WHERE id = p_scheduled_group_meal_id LIMIT 1;
  IF v_sgm.id IS NULL THEN
    RAISE EXCEPTION 'Scheduled meal not found';
  END IF;
  IF v_sgm.user_id <> v_my_id THEN
    RAISE EXCEPTION 'Not authorized to accept this suggestion';
  END IF;
  IF v_sgm.status <> 'pending' THEN
    RAISE EXCEPTION 'This suggestion was already accepted or declined';
  END IF;

  SELECT suggestion INTO v_suggestion_text FROM meal_suggestions WHERE id = v_sgm.suggestion_id;

  UPDATE scheduled_group_meals SET status = 'accepted' WHERE id = p_scheduled_group_meal_id;

  RETURN jsonb_build_object(
    'scheduled_date', v_sgm.scheduled_date,
    'meal_slot', v_sgm.meal_slot,
    'suggestion_text', COALESCE(v_suggestion_text, ''),
    'suggestion_id', v_sgm.suggestion_id,
    'voting_session_id', v_sgm.voting_session_id
  );
END;
$$;

-- 6. decline_suggested_meal
CREATE OR REPLACE FUNCTION public.decline_suggested_meal(p_scheduled_group_meal_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_my_id := public.get_my_profile_id();
  IF v_my_id IS NULL THEN
    RAISE EXCEPTION 'No profile found. Sign in again.';
  END IF;

  UPDATE scheduled_group_meals
  SET status = 'declined'
  WHERE id = p_scheduled_group_meal_id AND user_id = v_my_id AND status = 'pending';
END;
$$;

-- 7. get_member_schedule_acceptance (admin or own rows)
CREATE OR REPLACE FUNCTION public.get_member_schedule_acceptance(p_session_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_my_id := public.get_my_profile_id();
  IF v_my_id IS NULL THEN
    RAISE EXCEPTION 'No profile found. Sign in again.';
  END IF;

  IF NOT (public.is_member_of_group((SELECT group_id FROM voting_sessions WHERE id = p_session_id LIMIT 1))) THEN
    RAISE EXCEPTION 'Not a member of this group';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM voting_sessions vs
    JOIN group_members gm ON gm.group_id = vs.group_id
    WHERE vs.id = p_session_id AND gm.user_id = v_my_id AND gm.role = 'admin'
  ) INTO v_is_admin;

  IF v_is_admin THEN
    RETURN (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', sgm.id,
          'user_id', sgm.user_id,
          'username', p.username,
          'scheduled_date', sgm.scheduled_date,
          'meal_slot', sgm.meal_slot,
          'status', sgm.status,
          'suggestion_text', ms.suggestion
        ) ORDER BY sgm.scheduled_date, sgm.meal_slot, p.username
      ), '[]'::jsonb)
      FROM scheduled_group_meals sgm
      LEFT JOIN profiles p ON p.id = sgm.user_id
      LEFT JOIN meal_suggestions ms ON ms.id = sgm.suggestion_id
      WHERE sgm.voting_session_id = p_session_id
    );
  ELSE
    RETURN (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', sgm.id,
          'scheduled_date', sgm.scheduled_date,
          'meal_slot', sgm.meal_slot,
          'status', sgm.status,
          'suggestion_text', ms.suggestion
        ) ORDER BY sgm.scheduled_date, sgm.meal_slot
      ), '[]'::jsonb)
      FROM scheduled_group_meals sgm
      LEFT JOIN meal_suggestions ms ON ms.id = sgm.suggestion_id
      WHERE sgm.voting_session_id = p_session_id AND sgm.user_id = v_my_id
    );
  END IF;
END;
$$;

-- 8. Extend notification_type for post-vote (ignore duplicate_object if re-run)
DO $$
BEGIN
  ALTER TYPE notification_type ADD VALUE 'group_meal_suggested';
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
DO $$
BEGIN
  ALTER TYPE notification_type ADD VALUE 'group_meal_scheduled';
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
