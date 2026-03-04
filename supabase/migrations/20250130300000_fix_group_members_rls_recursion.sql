-- Fix "infinite recursion detected in policy for relation group_members".
-- Policies on group_members were reading from group_members, causing recursion.
-- Use SECURITY DEFINER helpers so the lookup bypasses RLS.

CREATE OR REPLACE FUNCTION public.is_member_of_group(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = public.get_my_profile_id()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_of_group(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id
      AND user_id = public.get_my_profile_id()
      AND role = 'admin'
  );
$$;

-- group_members: use helpers so we never SELECT from group_members inside RLS

DROP POLICY IF EXISTS "Group members can view members" ON group_members;
CREATE POLICY "Group members can view members" ON group_members
  FOR SELECT USING (public.is_member_of_group(group_id));

-- Admins can UPDATE/DELETE other members (not INSERT - creator adds self via policy below)
DROP POLICY IF EXISTS "Admins can manage members" ON group_members;
CREATE POLICY "Admins can update members" ON group_members
  FOR UPDATE USING (public.is_admin_of_group(group_id)) WITH CHECK (public.is_admin_of_group(group_id));
CREATE POLICY "Admins can delete members" ON group_members
  FOR DELETE USING (public.is_admin_of_group(group_id));

-- INSERT: only allow adding yourself (join by code or creator adding self as first member)
DROP POLICY IF EXISTS "Users can join group (self insert)" ON group_members;
CREATE POLICY "Users can join group (self insert)" ON group_members
  FOR INSERT WITH CHECK (user_id = public.get_my_profile_id());
