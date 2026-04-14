-- Allow group admins (and session initiator) to remove a suggested meal from an active voting session.
-- Deletes the meal_suggestion row; votes are removed by FK CASCADE or trigger.

CREATE OR REPLACE FUNCTION public.remove_meal_suggestion(p_suggestion_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_id UUID;
  v_session_id UUID;
  v_group_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_my_id := public.get_my_profile_id();
  IF v_my_id IS NULL THEN
    RAISE EXCEPTION 'No profile found. Sign in again.';
  END IF;

  SELECT ms.session_id, vs.group_id
  INTO v_session_id, v_group_id
  FROM meal_suggestions ms
  JOIN voting_sessions vs ON vs.id = ms.session_id
  WHERE ms.id = p_suggestion_id
  LIMIT 1;

  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'Suggestion not found';
  END IF;

  -- Only allow if session is still active
  IF NOT EXISTS (SELECT 1 FROM voting_sessions WHERE id = v_session_id AND status = 'active') THEN
    RAISE EXCEPTION 'Cannot remove suggestion from a closed or cancelled session';
  END IF;

  -- Current user must be group admin (or could also allow session initiator)
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = v_group_id AND user_id = v_my_id AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Only group admins can remove suggestions';
  END IF;

  DELETE FROM meal_suggestions WHERE id = p_suggestion_id;
END;
$$;
