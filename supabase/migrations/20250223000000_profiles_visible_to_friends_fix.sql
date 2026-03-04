-- Ensure friends (pending or accepted) can see each other's profiles without being in the same meal group.
-- get_my_friends JOINs to profiles; this policy allows that read for any friendship row.

DROP POLICY IF EXISTS "Friends can view basic user info" ON profiles;
CREATE POLICY "Friends can view basic user info" ON profiles
  FOR SELECT USING (
    id = public.get_my_profile_id()
    OR EXISTS (
      SELECT 1 FROM friendships f
      WHERE (
        (f.user_id = id AND f.friend_id = public.get_my_profile_id())
        OR (f.friend_id = id AND f.user_id = public.get_my_profile_id())
      )
      AND f.status::text IN ('accepted', 'pending')
    )
  );
