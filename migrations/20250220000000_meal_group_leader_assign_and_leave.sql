-- Leader can assign a new leader and relinquish role; when leader leaves, next member becomes leader.

-- Only the current leader (meal_groups.created_by) can assign a new leader.
CREATE OR REPLACE FUNCTION public.assign_new_leader(p_group_id UUID, p_new_leader_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_id UUID;
  v_created_by UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_my_id := public.get_my_profile_id();
  IF v_my_id IS NULL THEN
    RAISE EXCEPTION 'No profile found';
  END IF;

  SELECT created_by INTO v_created_by FROM meal_groups WHERE id = p_group_id LIMIT 1;
  IF v_created_by IS NULL THEN
    RAISE EXCEPTION 'Group not found';
  END IF;
  IF v_created_by <> v_my_id THEN
    RAISE EXCEPTION 'Only the current leader can assign a new leader';
  END IF;
  IF p_new_leader_user_id = v_my_id THEN
    RAISE EXCEPTION 'Choose a different member as the new leader';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM group_members WHERE group_id = p_group_id AND user_id = p_new_leader_user_id) THEN
    RAISE EXCEPTION 'New leader must be a member of the group';
  END IF;

  UPDATE meal_groups SET created_by = p_new_leader_user_id WHERE id = p_group_id;
  UPDATE group_members SET role = 'admin' WHERE group_id = p_group_id AND user_id = p_new_leader_user_id;
  UPDATE group_members SET role = 'member' WHERE group_id = p_group_id AND user_id = v_my_id;
END;
$$;

-- User can leave a group (removes their group_members row). If they were leader, trigger promotes next member.
CREATE OR REPLACE FUNCTION public.leave_group(p_group_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_my_id := public.get_my_profile_id();
  IF v_my_id IS NULL THEN
    RAISE EXCEPTION 'No profile found';
  END IF;

  IF NOT (public.is_member_of_group(p_group_id)) THEN
    RAISE EXCEPTION 'Not a member of this group';
  END IF;

  DELETE FROM group_members WHERE group_id = p_group_id AND user_id = v_my_id;
END;
$$;

-- When a member is removed: if they were the leader, assign next member as leader; if no members remain, delete the group.
CREATE OR REPLACE FUNCTION public.on_group_member_deleted_assign_leader()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_created_by UUID;
  v_new_leader_id UUID;
  v_remaining_count INT;
BEGIN
  SELECT created_by INTO v_created_by FROM meal_groups WHERE id = OLD.group_id LIMIT 1;
  IF v_created_by IS NOT NULL AND v_created_by = OLD.user_id THEN
    SELECT user_id INTO v_new_leader_id
    FROM group_members
    WHERE group_id = OLD.group_id
    ORDER BY joined_at ASC
    LIMIT 1;

    IF v_new_leader_id IS NOT NULL THEN
      UPDATE meal_groups SET created_by = v_new_leader_id WHERE id = OLD.group_id;
      UPDATE group_members SET role = 'admin' WHERE group_id = OLD.group_id AND user_id = v_new_leader_id;
    ELSE
      UPDATE meal_groups SET created_by = NULL WHERE id = OLD.group_id;
    END IF;
  END IF;

  SELECT COUNT(*) INTO v_remaining_count FROM group_members WHERE group_id = OLD.group_id;
  IF v_remaining_count = 0 THEN
    DELETE FROM meal_groups WHERE id = OLD.group_id;
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS group_members_assign_leader_on_leave ON group_members;
CREATE TRIGGER group_members_assign_leader_on_leave
  AFTER DELETE ON group_members
  FOR EACH ROW
  EXECUTE FUNCTION public.on_group_member_deleted_assign_leader();
