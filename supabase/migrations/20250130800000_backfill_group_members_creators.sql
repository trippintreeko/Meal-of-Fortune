-- Backfill group_members: add creator as admin for any meal_groups that don't have
-- a group_members row for created_by. Fixes "groups exist in Supabase but not in app"
-- when groups were created before the RPC or when the group_members insert failed.

INSERT INTO group_members (group_id, user_id, role)
SELECT mg.id, mg.created_by, 'admin'::group_member_role
FROM meal_groups mg
WHERE mg.created_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = mg.id AND gm.user_id = mg.created_by
  )
ON CONFLICT (group_id, user_id) DO NOTHING;
