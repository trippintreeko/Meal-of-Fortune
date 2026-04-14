-- 1. Friend requests visible: allow viewing profiles of users with pending or accepted friendship
--    so get_my_friends can show pending requests (username, friend_code) before both join a meal group.

DROP POLICY IF EXISTS "Friends can view basic user info" ON profiles;
CREATE POLICY "Friends can view basic user info" ON profiles
  FOR SELECT USING (
    id = public.get_my_profile_id()
    OR EXISTS (
      SELECT 1 FROM friendships f
      WHERE ((f.user_id = id AND f.friend_id = public.get_my_profile_id())
             OR (f.friend_id = id AND f.user_id = public.get_my_profile_id()))
      AND f.status IN ('accepted', 'pending')
    )
  );

-- 2. Profile counts for settings header: groups, friends (accepted), votes cast.

CREATE OR REPLACE FUNCTION public.get_profile_counts()
RETURNS TABLE (groups_count BIGINT, friends_count BIGINT, votes_count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH v_my_id AS (SELECT public.get_my_profile_id() AS id),
  groups AS (
    SELECT COUNT(*)::BIGINT AS c
    FROM meal_groups mg, v_my_id
    WHERE mg.created_by = v_my_id.id
       OR EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = mg.id AND gm.user_id = v_my_id.id)
  ),
  friends AS (
    SELECT COUNT(*)::BIGINT AS c
    FROM friendships fr, v_my_id
    WHERE (fr.user_id = v_my_id.id OR fr.friend_id = v_my_id.id)
      AND fr.status = 'accepted'
  ),
  votes AS (
    SELECT COUNT(*)::BIGINT AS c
    FROM votes v, v_my_id
    WHERE v.user_id = v_my_id.id
  )
  SELECT (SELECT c FROM groups), (SELECT c FROM friends), (SELECT c FROM votes);
$$;
