-- get_group_detail: add latest_completed_session_id so group screen can show "View results of closed vote"
-- when there is no active vote but there is a completed vote.

CREATE OR REPLACE FUNCTION public.get_group_detail(p_group_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_id UUID;
  v_group meal_groups%ROWTYPE;
  v_latest_completed_id UUID;
  v_active_deadline TIMESTAMPTZ;
  v_result jsonb;
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

  SELECT * INTO v_group FROM meal_groups WHERE id = p_group_id LIMIT 1;
  IF v_group.id IS NULL THEN
    RAISE EXCEPTION 'Group not found';
  END IF;

  SELECT id INTO v_latest_completed_id
  FROM voting_sessions
  WHERE group_id = p_group_id AND status = 'completed'
  ORDER BY decided_at DESC NULLS LAST, created_at DESC
  LIMIT 1;

  v_result := jsonb_build_object(
    'group', to_jsonb(v_group),
    'members', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', gm.id,
          'group_id', gm.group_id,
          'user_id', gm.user_id,
          'role', gm.role,
          'joined_at', gm.joined_at,
          'username', p.username
        ) ORDER BY (gm.role = 'admin') DESC, p.username
      ), '[]'::jsonb)
      FROM group_members gm
      LEFT JOIN profiles p ON p.id = gm.user_id
      WHERE gm.group_id = p_group_id
    ),
    'latest_completed_session_id', to_jsonb(v_latest_completed_id),
    'active_session_deadline', to_jsonb(v_active_deadline)
  );

  RETURN v_result;
END;
$$;
