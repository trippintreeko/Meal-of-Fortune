-- Allow users to delete their own notifications (e.g. swipe to delete on notifications screen).
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (user_id = public.get_my_profile_id());
