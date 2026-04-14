-- Session screen: load session + suggestions + votes, and submit suggestions/votes via RPCs
-- so all group members (e.g. trippintreeko_f7ec21) can see and participate regardless of RLS.

-- 1. get_session_detail: return session, suggestions (with username), and votes for the session.
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

  v_result := jsonb_build_object(
    'session', to_jsonb(v_session),
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

-- 2. add_meal_suggestion: add a suggestion to an active session (group member only).
CREATE OR REPLACE FUNCTION public.add_meal_suggestion(p_session_id UUID, p_suggestion_text TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_id UUID;
  v_session voting_sessions%ROWTYPE;
  v_suggestion_id UUID;
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
    RAISE EXCEPTION 'This vote has ended';
  END IF;
  IF NOT (public.is_member_of_group(v_session.group_id)) THEN
    RAISE EXCEPTION 'Not a member of this group';
  END IF;

  IF NULLIF(TRIM(p_suggestion_text), '') IS NULL THEN
    RAISE EXCEPTION 'Suggestion text is required';
  END IF;

  INSERT INTO meal_suggestions (session_id, user_id, suggestion)
  VALUES (p_session_id, v_my_id, TRIM(p_suggestion_text))
  RETURNING id INTO v_suggestion_id;

  RETURN v_suggestion_id;
END;
$$;

-- 3. set_my_vote: set or change the current user's vote for a suggestion in an active session.
CREATE OR REPLACE FUNCTION public.set_my_vote(p_session_id UUID, p_suggestion_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_id UUID;
  v_session voting_sessions%ROWTYPE;
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
    RAISE EXCEPTION 'This vote has ended';
  END IF;
  IF NOT (public.is_member_of_group(v_session.group_id)) THEN
    RAISE EXCEPTION 'Not a member of this group';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM meal_suggestions WHERE id = p_suggestion_id AND session_id = p_session_id) THEN
    RAISE EXCEPTION 'Suggestion not found in this session';
  END IF;

  DELETE FROM votes WHERE session_id = p_session_id AND user_id = v_my_id;
  INSERT INTO votes (session_id, user_id, suggestion_id)
  VALUES (p_session_id, v_my_id, p_suggestion_id);
END;
$$;
