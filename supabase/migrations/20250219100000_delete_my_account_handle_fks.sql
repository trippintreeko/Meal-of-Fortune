-- delete_my_account: clear FK references to the current user's profile, then delete the profile.
-- Fixes "violates foreign key constraint meal_groups_created_by_fkey" and similar when deleting account.

CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT id INTO v_id FROM profiles WHERE auth_id = auth.uid() LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated or profile not found';
  END IF;

  -- Remove or nullify references that do not have ON DELETE CASCADE to profiles
  DELETE FROM votes WHERE user_id = v_id;
  UPDATE meal_suggestions SET user_id = NULL WHERE user_id = v_id;
  UPDATE voting_sessions SET initiated_by = NULL WHERE initiated_by = v_id;
  UPDATE meal_groups SET created_by = NULL WHERE created_by = v_id;

  -- Tables with ON DELETE CASCADE (friendships, group_members, notifications, etc.) will be
  -- handled by the database when we delete the profile. Then delete the profile.
  DELETE FROM profiles WHERE auth_id = auth.uid();
END;
$$;

COMMENT ON FUNCTION public.delete_my_account() IS 'Delete the current user profile after clearing/nulling FK references (votes, meal_suggestions, voting_sessions, meal_groups). Client must call signOut() after.';
