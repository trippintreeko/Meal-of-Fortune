-- When the group leader deletes their account, reassign the leader to the next member (by joined_at)
-- or null created_by if they were the only member. Same logic as when the leader leaves the group.

CREATE OR REPLACE FUNCTION public.delete_user_profile_by_auth_id(p_auth_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_group_id UUID;
  v_new_leader_id UUID;
BEGIN
  SELECT id INTO v_id FROM profiles WHERE auth_id = p_auth_id LIMIT 1;
  IF v_id IS NULL THEN
    RETURN;
  END IF;

  DELETE FROM votes WHERE user_id = v_id;
  UPDATE meal_suggestions SET user_id = NULL WHERE user_id = v_id;
  UPDATE voting_sessions SET initiated_by = NULL WHERE initiated_by = v_id;

  -- Reassign leader for each group where this user was leader (next member by joined_at, or null).
  FOR v_group_id IN
    SELECT id FROM meal_groups WHERE created_by = v_id
  LOOP
    SELECT user_id INTO v_new_leader_id
    FROM group_members
    WHERE group_id = v_group_id AND user_id <> v_id
    ORDER BY joined_at ASC
    LIMIT 1;

    IF v_new_leader_id IS NOT NULL THEN
      UPDATE meal_groups SET created_by = v_new_leader_id WHERE id = v_group_id;
      UPDATE group_members SET role = 'admin' WHERE group_id = v_group_id AND user_id = v_new_leader_id;
    ELSE
      UPDATE meal_groups SET created_by = NULL WHERE id = v_group_id;
    END IF;
  END LOOP;

  DELETE FROM profiles WHERE auth_id = p_auth_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_group_id UUID;
  v_new_leader_id UUID;
BEGIN
  SELECT id INTO v_id FROM profiles WHERE auth_id = auth.uid() LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated or profile not found';
  END IF;

  DELETE FROM votes WHERE user_id = v_id;
  UPDATE meal_suggestions SET user_id = NULL WHERE user_id = v_id;
  UPDATE voting_sessions SET initiated_by = NULL WHERE initiated_by = v_id;

  -- Reassign leader for each group where this user was leader.
  FOR v_group_id IN
    SELECT id FROM meal_groups WHERE created_by = v_id
  LOOP
    SELECT user_id INTO v_new_leader_id
    FROM group_members
    WHERE group_id = v_group_id AND user_id <> v_id
    ORDER BY joined_at ASC
    LIMIT 1;

    IF v_new_leader_id IS NOT NULL THEN
      UPDATE meal_groups SET created_by = v_new_leader_id WHERE id = v_group_id;
      UPDATE group_members SET role = 'admin' WHERE group_id = v_group_id AND user_id = v_new_leader_id;
    ELSE
      UPDATE meal_groups SET created_by = NULL WHERE id = v_group_id;
    END IF;
  END LOOP;

  DELETE FROM profiles WHERE auth_id = auth.uid();
END;
$$;
