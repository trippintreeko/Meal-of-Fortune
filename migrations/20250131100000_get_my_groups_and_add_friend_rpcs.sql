-- 1. get_my_groups: return all groups the current user is in (creator or member).
--    Bypasses RLS so the second phone / joined users always see their groups.

CREATE OR REPLACE FUNCTION public.get_my_groups()
RETURNS SETOF meal_groups
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT mg.*
  FROM meal_groups mg
  WHERE mg.created_by = public.get_my_profile_id()
     OR EXISTS (
       SELECT 1 FROM group_members gm
       WHERE gm.group_id = mg.id AND gm.user_id = public.get_my_profile_id()
     );
$$;

-- 2. add_friend_by_code: send a friend request by entering someone's friend code.

CREATE OR REPLACE FUNCTION public.add_friend_by_code(p_friend_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_id UUID;
  v_friend_id UUID;
  v_username TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_my_id := public.get_my_profile_id();
  IF v_my_id IS NULL THEN
    RAISE EXCEPTION 'No profile found. Sign in again.';
  END IF;

  SELECT id, username INTO v_friend_id, v_username
  FROM profiles
  WHERE UPPER(TRIM(friend_code)) = UPPER(TRIM(p_friend_code))
  LIMIT 1;

  IF v_friend_id IS NULL THEN
    RAISE EXCEPTION 'No user found with that friend code.';
  END IF;

  IF v_friend_id = v_my_id THEN
    RAISE EXCEPTION 'You cannot add yourself.';
  END IF;

  INSERT INTO friendships (user_id, friend_id, status)
  VALUES (v_my_id, v_friend_id, 'pending')
  ON CONFLICT (user_id, friend_id) DO NOTHING;

  RETURN v_friend_id;
END;
$$;
