-- In-app notifications: respect profiles.notification_settings (quiet hours + per-type toggles).
-- Triggers call create_in_app_notification_if_allowed (SECURITY DEFINER). Edge functions use the same RPC.

-- Optional: extend enum if your project uses one for notifications.type (safe no-op if type is text or enum missing).
DO $enum$
BEGIN
  ALTER TYPE public.notification_type ADD VALUE 'meal_reminder';
EXCEPTION
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
END
$enum$;

DO $enum$
BEGIN
  ALTER TYPE public.notification_type ADD VALUE 'voting_session_started';
EXCEPTION
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
END
$enum$;

DO $enum$
BEGIN
  ALTER TYPE public.notification_type ADD VALUE 'weekly_summary';
EXCEPTION
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
END
$enum$;

DO $enum$
BEGIN
  ALTER TYPE public.notification_type ADD VALUE 'marketing_email';
EXCEPTION
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
END
$enum$;

CREATE OR REPLACE FUNCTION public._profile_in_notification_quiet_hours (settings jsonb, at_ts timestamptz)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $q$
DECLARE
  qh jsonb;
  st time;
  en time;
  cur_t time;
  enab boolean;
BEGIN
  qh := settings -> 'quiet_hours';
  IF qh IS NULL THEN
    RETURN false;
  END IF;
  enab := coalesce((qh ->> 'enabled')::boolean, false);
  IF NOT enab THEN
    RETURN false;
  END IF;
  BEGIN
    st := (qh ->> 'start')::time;
    en := (qh ->> 'end')::time;
  EXCEPTION
    WHEN others THEN
      RETURN false;
  END;
  cur_t := (at_ts AT TIME ZONE 'UTC')::time;
  IF st = en THEN
    RETURN false;
  END IF;
  IF st > en THEN
    RETURN cur_t >= st OR cur_t < en;
  END IF;
  RETURN cur_t >= st AND cur_t < en;
END;
$q$;

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

CREATE OR REPLACE FUNCTION public.create_meal_reminder_in_app_notification (
  p_title text,
  p_reminder_at timestamptz,
  p_event_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $mr$
DECLARE
  uid uuid;
  pid uuid;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RETURN;
  END IF;
  SELECT id INTO pid
  FROM public.profiles
  WHERE auth_id = uid
  LIMIT 1;
  IF pid IS NULL THEN
    RETURN;
  END IF;
  PERFORM public.create_in_app_notification_if_allowed(
    pid,
    'meal_reminder',
    'Meal reminder',
    coalesce(nullif(trim(p_title), ''), 'Upcoming meal'),
    jsonb_build_object(
      'reminder_at', p_reminder_at,
      'event_id', coalesce(p_event_id, '')
    )
  );
END;
$mr$;

REVOKE ALL ON FUNCTION public.create_meal_reminder_in_app_notification (text, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_meal_reminder_in_app_notification (text, timestamptz, text) TO authenticated;

-- Friend request: recipient is friend_id (requester is user_id).
CREATE OR REPLACE FUNCTION public.tg_notify_friend_request ()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $t$
DECLARE
  uname text;
BEGIN
  IF new.status::text IS DISTINCT FROM 'pending' THEN
    RETURN new;
  END IF;
  SELECT username INTO uname FROM public.profiles WHERE id = new.user_id;
  PERFORM public.create_in_app_notification_if_allowed(
    new.friend_id,
    'friend_request',
    'Friend request',
    coalesce(uname, 'Someone') || ' sent you a friend request',
    jsonb_build_object('friendship_id', new.id, 'from_user_id', new.user_id)
  );
  RETURN new;
END;
$t$;

DROP TRIGGER IF EXISTS trg_friendships_pending_notify ON public.friendships;
CREATE TRIGGER trg_friendships_pending_notify
AFTER INSERT ON public.friendships
FOR EACH ROW
EXECUTE FUNCTION public.tg_notify_friend_request();

-- New group member (invited / added).
CREATE OR REPLACE FUNCTION public.tg_notify_group_member_added ()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $t$
DECLARE
  gname text;
BEGIN
  SELECT name INTO gname FROM public.meal_groups WHERE id = new.group_id;
  PERFORM public.create_in_app_notification_if_allowed(
    new.user_id,
    'group_invite',
    'Added to a group',
    'You were added to ' || coalesce(gname, 'a group'),
    jsonb_build_object('group_id', new.group_id)
  );
  RETURN new;
END;
$t$;

DROP TRIGGER IF EXISTS trg_group_members_notify_added ON public.group_members;
CREATE TRIGGER trg_group_members_notify_added
AFTER INSERT ON public.group_members
FOR EACH ROW
EXECUTE FUNCTION public.tg_notify_group_member_added();

-- Voting session started: notify other members of the group.
CREATE OR REPLACE FUNCTION public.tg_notify_voting_session_started ()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $t$
DECLARE
  gname text;
  r record;
BEGIN
  IF new.status::text IS DISTINCT FROM 'active' THEN
    RETURN new;
  END IF;
  SELECT mg.name INTO gname FROM public.meal_groups mg WHERE mg.id = new.group_id;
  FOR r IN
    SELECT gm.user_id
    FROM public.group_members gm
    WHERE gm.group_id = new.group_id
      AND (new.initiated_by IS NULL OR gm.user_id IS DISTINCT FROM new.initiated_by)
  LOOP
    PERFORM public.create_in_app_notification_if_allowed(
      r.user_id,
      'voting_session_started',
      'Voting started',
      coalesce(gname, 'A group') || ': a new vote is open.',
      jsonb_build_object('session_id', new.id, 'group_id', new.group_id)
    );
  END LOOP;
  RETURN new;
END;
$t$;

DROP TRIGGER IF EXISTS trg_voting_sessions_started_notify ON public.voting_sessions;
CREATE TRIGGER trg_voting_sessions_started_notify
AFTER INSERT ON public.voting_sessions
FOR EACH ROW
EXECUTE FUNCTION public.tg_notify_voting_session_started();

-- New meal suggestion: notify other group members.
CREATE OR REPLACE FUNCTION public.tg_notify_meal_suggestion_added ()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $t$
DECLARE
  gid uuid;
  gname text;
  sname text;
  r record;
BEGIN
  SELECT vs.group_id INTO gid FROM public.voting_sessions vs WHERE vs.id = new.session_id;
  IF gid IS NULL THEN
    RETURN new;
  END IF;
  SELECT mg.name INTO gname FROM public.meal_groups mg WHERE mg.id = gid;
  SELECT username INTO sname FROM public.profiles WHERE id = new.user_id;
  FOR r IN
    SELECT gm.user_id
    FROM public.group_members gm
    WHERE gm.group_id = gid
      AND (new.user_id IS NULL OR gm.user_id IS DISTINCT FROM new.user_id)
  LOOP
    PERFORM public.create_in_app_notification_if_allowed(
      r.user_id,
      'suggestion_added',
      'New suggestion',
      coalesce(sname, 'Someone') || ' suggested "' || left(coalesce(new.suggestion, 'Meal'), 80) || '" in ' || coalesce(gname, 'your group'),
      jsonb_build_object('session_id', new.session_id, 'group_id', gid, 'suggestion_id', new.id)
    );
  END LOOP;
  RETURN new;
END;
$t$;

DROP TRIGGER IF EXISTS trg_meal_suggestions_notify ON public.meal_suggestions;
CREATE TRIGGER trg_meal_suggestions_notify
AFTER INSERT ON public.meal_suggestions
FOR EACH ROW
EXECUTE FUNCTION public.tg_notify_meal_suggestion_added();

-- Vote on someone else's suggestion: notify suggester.
CREATE OR REPLACE FUNCTION public.tg_notify_vote_on_suggestion ()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $t$
DECLARE
  owner_id uuid;
  meal_txt text;
  voter_name text;
BEGIN
  SELECT ms.user_id, ms.suggestion
  INTO owner_id, meal_txt
  FROM public.meal_suggestions ms
  WHERE ms.id = new.suggestion_id;

  IF owner_id IS NULL OR owner_id IS NOT DISTINCT FROM new.user_id THEN
    RETURN new;
  END IF;

  SELECT username INTO voter_name FROM public.profiles WHERE id = new.user_id;

  PERFORM public.create_in_app_notification_if_allowed(
    owner_id,
    'vote_cast',
    'New vote on your suggestion',
    coalesce(voter_name, 'Someone') || ' voted on "' || left(coalesce(meal_txt, 'your meal'), 80) || '"',
    jsonb_build_object('session_id', new.session_id, 'suggestion_id', new.suggestion_id, 'vote_user_id', new.user_id)
  );
  RETURN new;
END;
$t$;

DROP TRIGGER IF EXISTS trg_votes_notify_owner ON public.votes;
CREATE TRIGGER trg_votes_notify_owner
AFTER INSERT ON public.votes
FOR EACH ROW
EXECUTE FUNCTION public.tg_notify_vote_on_suggestion();

-- group_join_requests: do NOT add a trigger here — join_group_by_code (migrations/20250311000000_group_join_requests.sql)
-- already inserts a leader notification. After this migration, 20260329160000 replaces that RPC to use
-- create_in_app_notification_if_allowed for leader + admins (no duplicate rows).

-- Dedupe table for deadline reminder buckets (edge function inserts here).
CREATE TABLE IF NOT EXISTS public.voting_deadline_reminder_sent (
  session_id uuid NOT NULL REFERENCES public.voting_sessions (id) ON DELETE CASCADE,
  minutes_bucket integer NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, minutes_bucket)
);

ALTER TABLE public.voting_deadline_reminder_sent ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "voting_deadline_reminder_sent service" ON public.voting_deadline_reminder_sent;
CREATE POLICY "voting_deadline_reminder_sent service"
ON public.voting_deadline_reminder_sent
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

GRANT SELECT, INSERT, DELETE ON public.voting_deadline_reminder_sent TO service_role;

-- Cron: call via Edge `voting-deadline-reminders` every ~5–10 minutes.
CREATE OR REPLACE FUNCTION public.run_voting_deadline_reminder_pass ()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  n int := 0;
  ins int;
  s record;
  vb int;
  mins double precision;
  m record;
BEGIN
  FOR s IN
    SELECT id, group_id, deadline
    FROM public.voting_sessions
    WHERE status::text = 'active' AND deadline > now()
  LOOP
    mins := extract(epoch FROM (s.deadline - now())) / 60.0;
    FOREACH vb IN ARRAY ARRAY[30, 60, 120]
    LOOP
      IF mins >= (vb - 6) AND mins <= (vb + 6) THEN
        INSERT INTO public.voting_deadline_reminder_sent (session_id, minutes_bucket)
        VALUES (s.id, vb)
        ON CONFLICT DO NOTHING;
        GET DIAGNOSTICS ins = ROW_COUNT;
        IF ins > 0 THEN
          FOR m IN
            SELECT user_id FROM public.group_members WHERE group_id = s.group_id
          LOOP
            IF public.create_in_app_notification_if_allowed(
              m.user_id,
              'deadline_approaching',
              'Vote closing soon',
              'About ' || vb || ' minutes left to vote in your group.',
              jsonb_build_object('session_id', s.id, 'group_id', s.group_id, 'minutes', vb)
            ) THEN
              n := n + 1;
            END IF;
          END LOOP;
        END IF;
      END IF;
    END LOOP;
  END LOOP;
  RETURN n;
END;
$fn$;

REVOKE ALL ON FUNCTION public.run_voting_deadline_reminder_pass () FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_voting_deadline_reminder_pass () TO service_role;

-- Cron: weekly (e.g. Monday 9:00 UTC) via Edge `weekly-in-app-summary`.
CREATE OR REPLACE FUNCTION public.run_weekly_summary_notifications ()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  r record;
  n int := 0;
BEGIN
  FOR r IN
    SELECT
      p.id,
      coalesce(p.notification_settings, '{}'::jsonb) AS ns
    FROM public.profiles p
  LOOP
    IF coalesce((r.ns ->> 'weekly_summary')::boolean, false)
       AND NOT EXISTS (
         SELECT 1
         FROM public.notifications x
         WHERE x.user_id = r.id
           AND x.type::text = 'weekly_summary'
           AND x.created_at > now() - interval '6 days'
       )
    THEN
      IF public.create_in_app_notification_if_allowed(
        r.id,
        'weekly_summary',
        'Your weekly summary',
        'Open the app for last week''s meals, votes, and plans.',
        '{}'::jsonb
      ) THEN
        n := n + 1;
      END IF;
    END IF;
  END LOOP;
  RETURN n;
END;
$fn$;

REVOKE ALL ON FUNCTION public.run_weekly_summary_notifications () FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_weekly_summary_notifications () TO service_role;

-- Optional: run from SQL Editor as postgres/service role, e.g. select public.send_marketing_in_app_broadcast('Title','Body');
CREATE OR REPLACE FUNCTION public.send_marketing_in_app_broadcast (
  p_title text,
  p_body text,
  p_data jsonb DEFAULT '{}'::jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  r record;
  n int := 0;
BEGIN
  FOR r IN
    SELECT
      p.id,
      coalesce(p.notification_settings, '{}'::jsonb) AS ns
    FROM public.profiles p
  LOOP
    IF coalesce((r.ns ->> 'marketing_emails')::boolean, false) THEN
      IF public.create_in_app_notification_if_allowed(
        r.id,
        'marketing_email',
        left(coalesce(p_title, ''), 200),
        left(coalesce(p_body, ''), 2000),
        coalesce(p_data, '{}'::jsonb)
      ) THEN
        n := n + 1;
      END IF;
    END IF;
  END LOOP;
  RETURN n;
END;
$fn$;

REVOKE ALL ON FUNCTION public.send_marketing_in_app_broadcast (text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_marketing_in_app_broadcast (text, text, jsonb) TO service_role;
