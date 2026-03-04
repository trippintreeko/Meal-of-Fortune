-- get_my_friends: use SECURITY DEFINER so the JOIN to profiles is not filtered by RLS.
-- The function still only returns rows for the current user (get_my_profile_id() uses auth.uid()).
-- This makes the friends list show all accepted/pending friends even when not in the same meal group.

CREATE OR REPLACE FUNCTION public.get_my_friends()
RETURNS TABLE (
  friend_id UUID,
  username TEXT,
  friend_code TEXT,
  status TEXT,
  categories JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_id UUID;
BEGIN
  v_my_id := public.get_my_profile_id();
  IF v_my_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found. Sign out and sign in again.';
  END IF;

  RETURN QUERY
  SELECT
    p.id::UUID,
    p.username::TEXT,
    p.friend_code::TEXT,
    (CASE WHEN bool_or(fr.status = 'pending') THEN 'pending' ELSE 'accepted' END)::TEXT,
    (COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('id', fc.id, 'name', fc.name, 'color', fc.color))
       FROM friend_category_memberships fcm
       JOIN friend_categories fc ON fc.id = fcm.category_id AND fc.user_id = v_my_id
       WHERE fcm.user_id = v_my_id AND fcm.friend_id = p.id),
      '[]'::jsonb
    ))::JSONB,
    (MIN(fr.created_at))::TIMESTAMPTZ
  FROM friendships fr
  JOIN profiles p ON (
    (fr.user_id = v_my_id AND fr.friend_id = p.id) OR
    (fr.friend_id = v_my_id AND fr.user_id = p.id)
  )
  WHERE (fr.user_id = v_my_id OR fr.friend_id = v_my_id)
    AND fr.status IN ('accepted', 'pending')
  GROUP BY p.id, p.username, p.friend_code
  ORDER BY bool_or(fr.status = 'pending') DESC, p.username;
END;
$$;
