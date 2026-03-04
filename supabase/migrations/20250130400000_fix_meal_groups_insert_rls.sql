-- Fix "new row violates row-level security policy for table meal_groups".
-- Ensure created_by is set server-side and allow INSERT for any authenticated user.

CREATE OR REPLACE FUNCTION public.set_meal_group_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.created_by := public.get_my_profile_id();
  IF NEW.created_by IS NULL THEN
    RAISE EXCEPTION 'No profile found for current user. Sign in again or complete registration.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS meal_groups_set_created_by ON meal_groups;
CREATE TRIGGER meal_groups_set_created_by
  BEFORE INSERT ON meal_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.set_meal_group_created_by();

-- Drop every INSERT policy on meal_groups (in case an old one remains under any name)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'meal_groups' AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON meal_groups', pol.policyname);
  END LOOP;
END $$;

-- Single INSERT policy: any authenticated user; created_by set by trigger (or trigger raises if no profile)
CREATE POLICY "Authenticated users can create group" ON meal_groups
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
