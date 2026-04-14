-- Allow creators to SELECT their groups even without a group_members row.
-- Fixes "groups show in Supabase as created_by me but not on the phone" when
-- group_members wasn't populated (e.g. backfill not run or failed).

CREATE POLICY "Creators can view own group" ON meal_groups
  FOR SELECT
  USING (created_by = public.get_my_profile_id());
