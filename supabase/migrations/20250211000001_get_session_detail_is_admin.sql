-- Add is_admin to get_session_detail so session screen can show admin controls
CREATE OR REPLACE FUNCTION public.get_session_detail(p_session_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_id UUID;
  v_session voting_sessions%ROWTYPE;
  v_is_admin BOOLEAN;
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

  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = v_session.group_id AND user_id = v_my_id AND role = 'admin'
  ) INTO v_is_admin;

  v_result := jsonb_build_object(
    'session', to_jsonb(v_session),
    'is_admin', COALESCE(v_is_admin, false),
    'suggestions', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', ms.id,
          'session_id', ms.session_id,
          'user_id', ms.user_id,
          'suggestion', ms.suggestion,
          'category', ms.category,
          'vote_count', ms.vote_count,
          'created_at', ms.created_at,
          'username', p.username
        ) ORDER BY ms.created_at
      ), '[]'::jsonb)
      FROM meal_suggestions ms
      LEFT JOIN profiles p ON p.id = ms.user_id
      WHERE ms.session_id = p_session_id
    ),
    'votes', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('user_id', v.user_id, 'suggestion_id', v.suggestion_id)), '[]'::jsonb)
      FROM votes v
      WHERE v.session_id = p_session_id
    )
  );

  RETURN v_result;
END;
$$;
