-- Fix: notifications.type is enum notification_type; RPC used TEXT without cast (error on group create → group_invite trigger).
-- Safe if 20260329150000 already had the cast (idempotent CREATE OR REPLACE).

CREATE OR REPLACE FUNCTION public.create_in_app_notification_if_allowed (
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_data jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  s jsonb;
  allow boolean;
BEGIN
  IF p_user_id IS NULL OR length(trim(coalesce(p_type, ''))) = 0 THEN
    RETURN false;
  END IF;

  SELECT coalesce(notification_settings, '{}'::jsonb)
  INTO s
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  allow := CASE p_type
    WHEN 'friend_request' THEN coalesce((s -> 'friend_requests' ->> 'push')::boolean, true)
    WHEN 'group_invite' THEN coalesce((s -> 'group_invites' ->> 'push')::boolean, true)
    WHEN 'group_join_request' THEN coalesce((s -> 'group_invites' ->> 'push')::boolean, true)
    WHEN 'voting_session_started' THEN coalesce((s -> 'voting_started' ->> 'push')::boolean, true)
    WHEN 'suggestion_added' THEN coalesce((s -> 'new_suggestions' ->> 'push')::boolean, true)
    WHEN 'vote_cast' THEN coalesce((s -> 'votes_on_mine' ->> 'push')::boolean, true)
    WHEN 'result_ready' THEN coalesce((s -> 'voting_results' ->> 'push')::boolean, true)
    WHEN 'deadline_approaching' THEN coalesce((s -> 'deadline_reminders' ->> 'enabled')::boolean, true)
    WHEN 'meal_reminder' THEN coalesce((s -> 'meal_reminders' ->> 'enabled')::boolean, true)
    WHEN 'weekly_summary' THEN coalesce((s ->> 'weekly_summary')::boolean, false)
    WHEN 'marketing_email' THEN coalesce((s ->> 'marketing_emails')::boolean, false)
    ELSE true
  END;

  IF NOT allow THEN
    RETURN false;
  END IF;

  IF public._profile_in_notification_quiet_hours(s, now()) THEN
    RETURN false;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, data, read)
  VALUES (
    p_user_id,
    p_type::public.notification_type,
    p_title,
    left(coalesce(p_body, ''), 2000),
    coalesce(p_data, '{}'::jsonb),
    false
  );

  RETURN true;
END;
$fn$;

REVOKE ALL ON FUNCTION public.create_in_app_notification_if_allowed (uuid, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_in_app_notification_if_allowed (uuid, text, text, text, jsonb) TO service_role;
