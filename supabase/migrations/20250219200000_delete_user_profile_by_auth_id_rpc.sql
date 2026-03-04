-- RPC for Edge Function (service role): delete a user's profile by auth_id after FK cleanup.
-- Used by delete-account Edge Function; not exposed to anon. Only callable with service role.

CREATE OR REPLACE FUNCTION public.delete_user_profile_by_auth_id(p_auth_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT id INTO v_id FROM profiles WHERE auth_id = p_auth_id LIMIT 1;
  IF v_id IS NULL THEN
    RETURN;
  END IF;

  DELETE FROM votes WHERE user_id = v_id;
  UPDATE meal_suggestions SET user_id = NULL WHERE user_id = v_id;
  UPDATE voting_sessions SET initiated_by = NULL WHERE initiated_by = v_id;
  UPDATE meal_groups SET created_by = NULL WHERE created_by = v_id;

  DELETE FROM profiles WHERE auth_id = p_auth_id;
END;
$$;

COMMENT ON FUNCTION public.delete_user_profile_by_auth_id(UUID) IS 'Admin only: delete profile and clear FKs for given auth_id. Used by delete-account Edge Function.';
