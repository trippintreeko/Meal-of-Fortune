-- Requires 20260329150000_in_app_notifications_triggers.sql (create_in_app_notification_if_allowed).
-- Replaces direct INSERT in join_group_by_code so group_invites + quiet_hours match other in-app paths.
-- Notifies meal_groups.created_by and all group_members with role = admin (deduped).

CREATE OR REPLACE FUNCTION public.join_group_by_code (p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id uuid;
  v_user_id uuid;
  v_leader_id uuid;
  v_group_name text;
  v_requester_username text;
  v_request_id uuid;
  v_title text;
  v_body text;
  v_data jsonb;
  r record;
BEGIN
  v_user_id := (SELECT id FROM profiles WHERE auth_id = auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id, created_by, name INTO v_group_id, v_leader_id, v_group_name
  FROM meal_groups
  WHERE upper(trim(group_code)) = upper(trim(p_code))
  LIMIT 1;

  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'Invalid group code';
  END IF;

  IF EXISTS (SELECT 1 FROM group_members WHERE group_id = v_group_id AND user_id = v_user_id) THEN
    RETURN jsonb_build_object('group_id', v_group_id, 'status', 'already_member');
  END IF;

  IF EXISTS (
    SELECT 1 FROM group_join_requests
    WHERE group_id = v_group_id AND user_id = v_user_id AND status = 'pending'
  ) THEN
    RETURN jsonb_build_object('group_id', v_group_id, 'status', 'request_pending');
  END IF;

  INSERT INTO group_join_requests (group_id, user_id, status)
  VALUES (v_group_id, v_user_id, 'pending')
  RETURNING id INTO v_request_id;

  SELECT username INTO v_requester_username FROM profiles WHERE id = v_user_id;

  v_title := 'Join request';
  v_body := coalesce(v_requester_username, 'Someone') || ' wants to join ' || coalesce(v_group_name, 'your group');
  v_data := jsonb_build_object(
    'group_id', v_group_id,
    'request_id', v_request_id,
    'requester_id', v_user_id,
    'requester_username', coalesce(v_requester_username, 'Unknown'),
    'group_name', v_group_name
  );

  FOR r IN
    SELECT DISTINCT m.recipient_id
    FROM (
      SELECT g.created_by AS recipient_id
      FROM meal_groups g
      WHERE g.id = v_group_id AND g.created_by IS NOT NULL
      UNION
      SELECT gm.user_id AS recipient_id
      FROM group_members gm
      WHERE gm.group_id = v_group_id AND gm.role = 'admin'::group_member_role
    ) m
    WHERE m.recipient_id IS NOT NULL
  LOOP
    PERFORM public.create_in_app_notification_if_allowed(
      r.recipient_id,
      'group_join_request',
      v_title,
      v_body,
      v_data
    );
  END LOOP;

  RETURN jsonb_build_object('group_id', v_group_id, 'status', 'request_sent');
END;
$$;

-- Clear join-request cards for every recipient (leader + admins), not only the actor.
CREATE OR REPLACE FUNCTION public.respond_to_join_request (p_request_id uuid, p_accept boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_id uuid;
  v_req group_join_requests%ROWTYPE;
  v_is_leader_or_admin boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_my_id := public.get_my_profile_id();
  IF v_my_id IS NULL THEN
    RAISE EXCEPTION 'No profile found';
  END IF;

  SELECT * INTO v_req FROM group_join_requests WHERE id = p_request_id AND status = 'pending' LIMIT 1;
  IF v_req.id IS NULL THEN
    RAISE EXCEPTION 'Request not found or already decided';
  END IF;

  v_is_leader_or_admin := EXISTS (
    SELECT 1 FROM meal_groups mg WHERE mg.id = v_req.group_id AND mg.created_by = v_my_id
  ) OR EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = v_req.group_id AND gm.user_id = v_my_id AND gm.role = 'admin'
  );

  IF NOT v_is_leader_or_admin THEN
    RAISE EXCEPTION 'Only the group leader or an admin can respond to join requests';
  END IF;

  IF p_accept THEN
    INSERT INTO group_members (group_id, user_id, role)
    VALUES (v_req.group_id, v_req.user_id, 'member')
    ON CONFLICT (group_id, user_id) DO NOTHING;
  END IF;

  UPDATE group_join_requests
  SET
    status = CASE WHEN p_accept THEN 'accepted'::group_join_request_status ELSE 'denied'::group_join_request_status END,
    decided_at = now(),
    decided_by = v_my_id
  WHERE id = p_request_id;

  DELETE FROM notifications
  WHERE type = 'group_join_request'::notification_type
    AND (data ->> 'request_id')::uuid = p_request_id;
END;
$$;
