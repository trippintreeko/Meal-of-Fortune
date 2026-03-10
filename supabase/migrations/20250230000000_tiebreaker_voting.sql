-- Tiebreaker: when voting ends in a tie, use spin-the-wheel (server picks random winner; clients show wheel landing on that winner).
-- 1. Add tiebreaker_used to voting_sessions
-- 2. complete_voting_session: if multiple suggestions have max votes, pick one at random and set tiebreaker_used = true
-- 3. finalize_voting_if_deadline_passed: same logic
-- 4. get_voting_statistics: return tiebreaker_used in jsonb

ALTER TABLE voting_sessions ADD COLUMN IF NOT EXISTS tiebreaker_used BOOLEAN DEFAULT FALSE;

CREATE OR REPLACE FUNCTION public.complete_voting_session(p_session_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session voting_sessions%ROWTYPE;
  v_my_id UUID;
  v_winner_id UUID;
  v_max_count BIGINT;
  v_tied_ids UUID[];
  v_now TIMESTAMPTZ := NOW();
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
    RAISE EXCEPTION 'Can only close an active vote';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = v_session.group_id AND user_id = v_my_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only a group admin can close the poll';
  END IF;

  SELECT MAX(cnt) INTO v_max_count
  FROM (SELECT COUNT(*) AS cnt FROM votes WHERE session_id = p_session_id GROUP BY suggestion_id) t;

  IF v_max_count IS NULL THEN
    UPDATE voting_sessions
    SET status = 'completed', winner_suggestion_id = NULL, decided_at = v_now, tiebreaker_used = FALSE
    WHERE id = p_session_id;
  ELSE
    SELECT ARRAY_AGG(suggestion_id ORDER BY suggestion_id) INTO v_tied_ids
    FROM votes
    WHERE session_id = p_session_id
    GROUP BY suggestion_id
    HAVING COUNT(*) = v_max_count;

    IF array_length(v_tied_ids, 1) > 1 THEN
      v_winner_id := v_tied_ids[1 + floor(random() * array_length(v_tied_ids, 1))::int];
      UPDATE voting_sessions
      SET status = 'completed', winner_suggestion_id = v_winner_id, decided_at = v_now, tiebreaker_used = TRUE
      WHERE id = p_session_id;
    ELSE
      v_winner_id := v_tied_ids[1];
      UPDATE voting_sessions
      SET status = 'completed', winner_suggestion_id = v_winner_id, decided_at = v_now, tiebreaker_used = FALSE
      WHERE id = p_session_id;
    END IF;
  END IF;

  UPDATE meal_groups
  SET active_voting_session = NULL
  WHERE id = v_session.group_id AND active_voting_session = p_session_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_voting_if_deadline_passed(p_session_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session voting_sessions%ROWTYPE;
  v_my_id UUID;
  v_winner_id UUID;
  v_max_count BIGINT;
  v_tied_ids UUID[];
  v_now TIMESTAMPTZ := NOW();
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
    RETURN FALSE;
  END IF;
  IF v_session.status <> 'active' THEN
    RETURN FALSE;
  END IF;
  IF v_session.deadline > v_now THEN
    RETURN FALSE;
  END IF;
  IF NOT (public.is_member_of_group(v_session.group_id)) THEN
    RAISE EXCEPTION 'Not a member of this group';
  END IF;

  SELECT MAX(cnt) INTO v_max_count
  FROM (SELECT COUNT(*) AS cnt FROM votes WHERE session_id = p_session_id GROUP BY suggestion_id) t;

  IF v_max_count IS NULL THEN
    UPDATE voting_sessions
    SET status = 'completed', winner_suggestion_id = NULL, decided_at = v_now, tiebreaker_used = FALSE
    WHERE id = p_session_id;
  ELSE
    SELECT ARRAY_AGG(suggestion_id ORDER BY suggestion_id) INTO v_tied_ids
    FROM votes
    WHERE session_id = p_session_id
    GROUP BY suggestion_id
    HAVING COUNT(*) = v_max_count;

    IF array_length(v_tied_ids, 1) > 1 THEN
      v_winner_id := v_tied_ids[1 + floor(random() * array_length(v_tied_ids, 1))::int];
      UPDATE voting_sessions
      SET status = 'completed', winner_suggestion_id = v_winner_id, decided_at = v_now, tiebreaker_used = TRUE
      WHERE id = p_session_id;
    ELSE
      v_winner_id := v_tied_ids[1];
      UPDATE voting_sessions
      SET status = 'completed', winner_suggestion_id = v_winner_id, decided_at = v_now, tiebreaker_used = FALSE
      WHERE id = p_session_id;
    END IF;
  END IF;

  UPDATE meal_groups
  SET active_voting_session = NULL
  WHERE id = v_session.group_id AND active_voting_session = p_session_id;

  RETURN TRUE;
END;
$$;

-- get_voting_statistics: add tiebreaker_used to returned jsonb
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
    'tiebreaker_used', COALESCE(v_session.tiebreaker_used, FALSE),
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
