-- Allow users to request to join a group again after they left (or after a previous request was accepted/denied).
-- Drop the table-level unique on (group_id, user_id) and enforce only one pending request per (group_id, user_id).

ALTER TABLE group_join_requests DROP CONSTRAINT IF EXISTS group_join_requests_group_id_user_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_group_join_requests_pending_unique
  ON group_join_requests (group_id, user_id) WHERE status = 'pending';
