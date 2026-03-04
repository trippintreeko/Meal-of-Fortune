-- complete_voting_session (admin): close poll and set winner; clear active_voting_session.
-- finalize_voting_if_deadline_passed: any member can call when deadline has passed; same completion logic.

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

  SELECT suggestion_id INTO v_winner_id
  FROM votes
  WHERE session_id = p_session_id
  GROUP BY suggestion_id
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  UPDATE voting_sessions
  SET status = 'completed', winner_suggestion_id = v_winner_id, decided_at = v_now
  WHERE id = p_session_id;

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
    RETURN FALSE;
  END IF;
  IF v_session.deadline > v_now THEN
    RETURN FALSE;
  END IF;
  IF NOT (public.is_member_of_group(v_session.group_id)) THEN
    RAISE EXCEPTION 'Not a member of this group';
  END IF;

  SELECT suggestion_id INTO v_winner_id
  FROM votes
  WHERE session_id = p_session_id
  GROUP BY suggestion_id
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  UPDATE voting_sessions
  SET status = 'completed', winner_suggestion_id = v_winner_id, decided_at = v_now
  WHERE id = p_session_id;

  UPDATE meal_groups
  SET active_voting_session = NULL
  WHERE id = v_session.group_id AND active_voting_session = p_session_id;

  RETURN TRUE;
END;
$$;
