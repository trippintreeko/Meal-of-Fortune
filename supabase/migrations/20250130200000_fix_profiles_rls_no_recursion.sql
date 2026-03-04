-- Fix 500 on SELECT from profiles: RLS policies that do (SELECT id FROM profiles WHERE auth_id = auth.uid())
-- cause a recursive read on profiles. Use a SECURITY DEFINER function so the lookup bypasses RLS.

CREATE OR REPLACE FUNCTION public.get_my_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM profiles WHERE auth_id = auth.uid() LIMIT 1;
$$;

-- Profiles: "Friends can view" - use helper to avoid recursion
DROP POLICY IF EXISTS "Friends can view basic user info" ON profiles;
CREATE POLICY "Friends can view basic user info" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM friendships f
      WHERE ((f.user_id = id AND f.friend_id = public.get_my_profile_id())
             OR (f.friend_id = id AND f.user_id = public.get_my_profile_id()))
      AND f.status = 'accepted'
    )
  );

-- Friendships
DROP POLICY IF EXISTS "Users can manage own friendships" ON friendships;
CREATE POLICY "Users can manage own friendships" ON friendships
  FOR ALL USING (
    user_id = public.get_my_profile_id()
    OR friend_id = public.get_my_profile_id()
  );

-- Meal groups
DROP POLICY IF EXISTS "Group members can view group" ON meal_groups;
CREATE POLICY "Group members can view group" ON meal_groups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = id AND gm.user_id = public.get_my_profile_id()
    )
  );

DROP POLICY IF EXISTS "Group members can update group" ON meal_groups;
CREATE POLICY "Group members can update group" ON meal_groups
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = id AND gm.user_id = public.get_my_profile_id()
    )
  );

DROP POLICY IF EXISTS "Authenticated users can create group" ON meal_groups;
CREATE POLICY "Authenticated users can create group" ON meal_groups
  FOR INSERT WITH CHECK (created_by = public.get_my_profile_id());

-- Group members
DROP POLICY IF EXISTS "Group members can view members" ON group_members;
CREATE POLICY "Group members can view members" ON group_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id AND gm.user_id = public.get_my_profile_id()
    )
  );

DROP POLICY IF EXISTS "Admins can manage members" ON group_members;
CREATE POLICY "Admins can manage members" ON group_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
        AND gm.user_id = public.get_my_profile_id()
        AND gm.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can join group (self insert)" ON group_members;
CREATE POLICY "Users can join group (self insert)" ON group_members
  FOR INSERT WITH CHECK (user_id = public.get_my_profile_id());

-- Voting sessions
DROP POLICY IF EXISTS "Group members can view sessions" ON voting_sessions;
CREATE POLICY "Group members can view sessions" ON voting_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = voting_sessions.group_id AND gm.user_id = public.get_my_profile_id()
    )
  );

DROP POLICY IF EXISTS "Group members can create session" ON voting_sessions;
CREATE POLICY "Group members can create session" ON voting_sessions
  FOR INSERT WITH CHECK (
    initiated_by = public.get_my_profile_id()
    AND EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = voting_sessions.group_id AND gm.user_id = public.get_my_profile_id()
    )
  );

DROP POLICY IF EXISTS "Group members can update session" ON voting_sessions;
CREATE POLICY "Group members can update session" ON voting_sessions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = voting_sessions.group_id AND gm.user_id = public.get_my_profile_id()
    )
  );

-- Meal suggestions
DROP POLICY IF EXISTS "Group members can view suggestions" ON meal_suggestions;
CREATE POLICY "Group members can view suggestions" ON meal_suggestions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM voting_sessions vs
      JOIN group_members gm ON gm.group_id = vs.group_id
      WHERE vs.id = meal_suggestions.session_id AND gm.user_id = public.get_my_profile_id()
    )
  );

DROP POLICY IF EXISTS "Group members can add suggestions" ON meal_suggestions;
CREATE POLICY "Group members can add suggestions" ON meal_suggestions
  FOR INSERT WITH CHECK (
    user_id = public.get_my_profile_id()
    AND EXISTS (
      SELECT 1 FROM voting_sessions vs
      JOIN group_members gm ON gm.group_id = vs.group_id
      WHERE vs.id = session_id AND vs.status = 'active' AND gm.user_id = public.get_my_profile_id()
    )
  );

-- Votes
DROP POLICY IF EXISTS "Group members can view votes" ON votes;
CREATE POLICY "Group members can view votes" ON votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM voting_sessions vs
      JOIN group_members gm ON gm.group_id = vs.group_id
      WHERE vs.id = votes.session_id AND gm.user_id = public.get_my_profile_id()
    )
  );

DROP POLICY IF EXISTS "Group members can cast vote" ON votes;
CREATE POLICY "Group members can cast vote" ON votes
  FOR INSERT WITH CHECK (
    user_id = public.get_my_profile_id()
    AND EXISTS (
      SELECT 1 FROM voting_sessions vs
      JOIN group_members gm ON gm.group_id = vs.group_id
      WHERE vs.id = session_id AND vs.status = 'active' AND gm.user_id = public.get_my_profile_id()
    )
  );

DROP POLICY IF EXISTS "Users can delete own vote" ON votes;
CREATE POLICY "Users can delete own vote" ON votes
  FOR DELETE USING (user_id = public.get_my_profile_id());

DROP POLICY IF EXISTS "Users can update own vote" ON votes;
CREATE POLICY "Users can update own vote" ON votes
  FOR UPDATE USING (user_id = public.get_my_profile_id());

-- Notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id = public.get_my_profile_id());

DROP POLICY IF EXISTS "Users can update own notifications (mark read)" ON notifications;
CREATE POLICY "Users can update own notifications (mark read)" ON notifications
  FOR UPDATE USING (user_id = public.get_my_profile_id());
