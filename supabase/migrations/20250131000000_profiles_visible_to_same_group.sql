-- Allow group members to see each other's profiles (e.g. username in group detail).
-- Fixes "Unknown" for other members when they are not friends — RLS was only allowing
-- "Friends can view basic user info", so non-friends in the same meal group were hidden.

CREATE POLICY "Group members can view same-group profiles" ON profiles
  FOR SELECT USING (
    id = public.get_my_profile_id()
    OR EXISTS (
      SELECT 1 FROM group_members g1
      JOIN group_members g2 ON g1.group_id = g2.group_id AND g2.user_id = profiles.id
      WHERE g1.user_id = public.get_my_profile_id()
    )
  );
