-- Address Supabase security lint:
-- 1. Function search path mutable (public.set_updated_at)
-- 2. RLS policy always true on notifications INSERT

-- =============================================================================
-- 1. set_updated_at: set fixed search_path so name resolution is deterministic
-- =============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- =============================================================================
-- 2. notifications: restrict INSERT so clients can only insert for own user_id.
--    Backend/Edge Functions using service_role bypass RLS and can still insert
--    for any user (e.g. send-group-notification, process-voting-deadline).
-- =============================================================================
DROP POLICY IF EXISTS "Allow insert notifications" ON notifications;
CREATE POLICY "Allow insert notifications" ON notifications
  FOR INSERT
  WITH CHECK (user_id = public.get_my_profile_id());
