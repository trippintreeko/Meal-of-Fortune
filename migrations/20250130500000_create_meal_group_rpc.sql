-- Bypass RLS for group creation: use an RPC so inserts run with definer rights.
-- Fixes "new row violates row-level security policy for table meal_groups" when
-- the policy check fails (e.g. auth context not available to the policy).

CREATE OR REPLACE FUNCTION public.create_meal_group(p_name TEXT, p_group_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
  v_group_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_profile_id := public.get_my_profile_id();
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'No profile found for current user. Sign in again or complete registration.';
  END IF;

  INSERT INTO meal_groups (name, group_code, created_by)
  VALUES (p_name, p_group_code, v_profile_id)
  RETURNING id INTO v_group_id;

  INSERT INTO group_members (group_id, user_id, role)
  VALUES (v_group_id, v_profile_id, 'admin');

  RETURN v_group_id;
END;
$$;
