-- Voting session enhancements: description, scheduled meal, and admin RPCs
-- See docs/VOTING-SESSION-ENHANCEMENT.md

-- 1. Extend voting_sessions
ALTER TABLE voting_sessions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE voting_sessions ADD COLUMN IF NOT EXISTS scheduled_meal_date DATE;
ALTER TABLE voting_sessions ADD COLUMN IF NOT EXISTS scheduled_meal_slot TEXT;

-- 2. start_voting_session: admin only, create session and set active_voting_session on group
CREATE OR REPLACE FUNCTION public.start_voting_session(
  p_group_id UUID,
  p_deadline TIMESTAMPTZ,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_id UUID;
  v_session_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_my_id := public.get_my_profile_id();
  IF v_my_id IS NULL THEN
    RAISE EXCEPTION 'No profile found. Sign in again.';
  END IF;

  IF NOT (public.is_member_of_group(p_group_id)) THEN
    RAISE EXCEPTION 'Not a member of this group';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = v_my_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only a group admin can start a vote';
  END IF;

  IF EXISTS (SELECT 1 FROM meal_groups WHERE id = p_group_id AND active_voting_session IS NOT NULL) THEN
    RAISE EXCEPTION 'This group already has an active voting session';
  END IF;

  INSERT INTO voting_sessions (group_id, initiated_by, status, deadline, description)
  VALUES (p_group_id, v_my_id, 'active', p_deadline, NULLIF(TRIM(p_description), ''))
  RETURNING id INTO v_session_id;

  UPDATE meal_groups SET active_voting_session = v_session_id WHERE id = p_group_id;

  RETURN v_session_id;
END;
$$;

-- 3. extend_voting_deadline: admin only
CREATE OR REPLACE FUNCTION public.extend_voting_deadline(
  p_session_id UUID,
  p_new_deadline TIMESTAMPTZ
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session voting_sessions%ROWTYPE;
  v_my_id UUID;
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
  IF v_session.status <> 'active' THEN
    RAISE EXCEPTION 'Can only extend an active vote';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = v_session.group_id AND user_id = v_my_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only a group admin can extend the deadline';
  END IF;

  UPDATE voting_sessions SET deadline = p_new_deadline WHERE id = p_session_id;
END;
$$;

-- 4. cancel_voting_session: admin only, set status cancelled and clear active_voting_session
CREATE OR REPLACE FUNCTION public.cancel_voting_session(p_session_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session voting_sessions%ROWTYPE;
  v_my_id UUID;
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
  IF v_session.status <> 'active' THEN
    RAISE EXCEPTION 'Can only cancel an active vote';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = v_session.group_id AND user_id = v_my_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only a group admin can cancel the vote';
  END IF;

  UPDATE voting_sessions SET status = 'cancelled' WHERE id = p_session_id;
  UPDATE meal_groups SET active_voting_session = NULL WHERE id = v_session.group_id AND active_voting_session = p_session_id;
END;
$$;

-- 5. schedule_winning_meal: set scheduled_meal_date/slot on session, return winner info for client calendar
CREATE OR REPLACE FUNCTION public.schedule_winning_meal(
  p_session_id UUID,
  p_meal_date DATE,
  p_meal_slot TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_id UUID;
  v_session voting_sessions%ROWTYPE;
  v_winner_id UUID;
  v_winner_text TEXT;
  v_vote_count INT;
  v_total_voters INT;
  v_suggested_by TEXT;
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
    RAISE EXCEPTION 'Can only schedule meal for a completed vote';
  END IF;
  IF v_session.winner_suggestion_id IS NULL THEN
    RAISE EXCEPTION 'No winner for this session';
  END IF;
  IF NOT (public.is_member_of_group(v_session.group_id)) THEN
    RAISE EXCEPTION 'Not a member of this group';
  END IF;

  v_winner_id := v_session.winner_suggestion_id;

  SELECT ms.suggestion, ms.vote_count, p.username INTO v_winner_text, v_vote_count, v_suggested_by
  FROM meal_suggestions ms
  LEFT JOIN profiles p ON p.id = ms.user_id
  WHERE ms.id = v_winner_id;

  SELECT COUNT(*)::INT INTO v_total_voters FROM votes WHERE session_id = p_session_id;

  UPDATE voting_sessions
  SET scheduled_meal_date = p_meal_date, scheduled_meal_slot = p_meal_slot
  WHERE id = p_session_id;

  RETURN jsonb_build_object(
    'session_id', p_session_id,
    'winner_suggestion_id', v_winner_id,
    'suggestion_text', COALESCE(v_winner_text, ''),
    'vote_count', COALESCE(v_vote_count, 0),
    'total_voters', COALESCE(v_total_voters, 0),
    'suggested_by', COALESCE(v_suggested_by, ''),
    'scheduled_meal_date', p_meal_date,
    'scheduled_meal_slot', p_meal_slot
  );
END;
$$;

-- Realtime: session screen can subscribe to voting_sessions for deadline/status changes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'voting_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE voting_sessions;
  END IF;
END $$;
