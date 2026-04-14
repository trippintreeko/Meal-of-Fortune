-- Pending group join requests: when a user joins via group code, leader sees a request and can accept/deny.

-- 1. Enum for request status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'group_join_request_status') THEN
    CREATE TYPE group_join_request_status AS ENUM ('pending', 'accepted', 'denied');
  END IF;
END
$$;

-- 2. Table for join requests (no table-level unique on group_id, user_id so users can request again after leaving)
CREATE TABLE IF NOT EXISTS group_join_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES meal_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status group_join_request_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  decided_at TIMESTAMPTZ,
  decided_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_group_join_requests_group_id ON group_join_requests(group_id);
CREATE INDEX IF NOT EXISTS idx_group_join_requests_user_id ON group_join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_group_join_requests_status ON group_join_requests(group_id, status) WHERE status = 'pending';
-- Only one pending request per (group_id, user_id); past accepted/denied requests allow a new request (e.g. after leaving)
CREATE UNIQUE INDEX IF NOT EXISTS idx_group_join_requests_pending_unique ON group_join_requests (group_id, user_id) WHERE status = 'pending';

ALTER TABLE group_join_requests ENABLE ROW LEVEL SECURITY;

-- RLS: only group leader (or admins) can see/update requests for their group. Requester can see own request.
DROP POLICY IF EXISTS "Group leaders can view pending requests for their group" ON group_join_requests;
CREATE POLICY "Group leaders can view pending requests for their group"
  ON group_join_requests FOR SELECT
  USING (
    (user_id = (SELECT id FROM profiles WHERE auth_id = auth.uid()))
    OR (EXISTS (
      SELECT 1 FROM meal_groups mg
      WHERE mg.id = group_join_requests.group_id AND mg.created_by = (SELECT id FROM profiles WHERE auth_id = auth.uid())
    ))
    OR (EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_join_requests.group_id AND gm.user_id = (SELECT id FROM profiles WHERE auth_id = auth.uid()) AND gm.role = 'admin'
    ))
  );

DROP POLICY IF EXISTS "Only leader or admin can update join requests" ON group_join_requests;
CREATE POLICY "Only leader or admin can update join requests"
  ON group_join_requests FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM meal_groups mg WHERE mg.id = group_join_requests.group_id AND mg.created_by = (SELECT id FROM profiles WHERE auth_id = auth.uid()))
    OR EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = group_join_requests.group_id AND gm.user_id = (SELECT id FROM profiles WHERE auth_id = auth.uid()) AND gm.role = 'admin')
  );

-- 3. Add notification type for group join request
DO $$
BEGIN
  ALTER TYPE notification_type ADD VALUE 'group_join_request';
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

-- 4. Replace join_group_by_code: create pending request and notify leader instead of adding member directly.
-- Returns jsonb { group_id, status: 'already_member' | 'request_pending' | 'request_sent' } so the app can show the right message.
-- Must DROP first because return type changes from UUID to jsonb.
DROP FUNCTION IF EXISTS public.join_group_by_code(TEXT);

CREATE OR REPLACE FUNCTION public.join_group_by_code(p_code TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id UUID;
  v_user_id UUID;
  v_leader_id UUID;
  v_group_name TEXT;
  v_requester_username TEXT;
  v_request_id UUID;
  v_status TEXT;
BEGIN
  v_user_id := (SELECT id FROM profiles WHERE auth_id = auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id, created_by, name INTO v_group_id, v_leader_id, v_group_name
  FROM meal_groups WHERE UPPER(TRIM(group_code)) = UPPER(TRIM(p_code)) LIMIT 1;

  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'Invalid group code';
  END IF;

  -- If already a member, return (idempotent)
  IF EXISTS (SELECT 1 FROM group_members WHERE group_id = v_group_id AND user_id = v_user_id) THEN
    RETURN jsonb_build_object('group_id', v_group_id, 'status', 'already_member');
  END IF;

  -- If already a pending request
  IF EXISTS (SELECT 1 FROM group_join_requests WHERE group_id = v_group_id AND user_id = v_user_id AND status = 'pending') THEN
    RETURN jsonb_build_object('group_id', v_group_id, 'status', 'request_pending');
  END IF;

  -- Create pending join request
  INSERT INTO group_join_requests (group_id, user_id, status)
  VALUES (v_group_id, v_user_id, 'pending')
  RETURNING id INTO v_request_id;

  SELECT username INTO v_requester_username FROM profiles WHERE id = v_user_id;

  -- Notify group leader
  IF v_leader_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
      v_leader_id,
      'group_join_request',
      'Join request',
      COALESCE(v_requester_username, 'Someone') || ' wants to join ' || COALESCE(v_group_name, 'your group'),
      jsonb_build_object(
        'group_id', v_group_id,
        'request_id', v_request_id,
        'requester_id', v_user_id,
        'requester_username', COALESCE(v_requester_username, 'Unknown'),
        'group_name', v_group_name
      )
    );
  END IF;

  RETURN jsonb_build_object('group_id', v_group_id, 'status', 'request_sent');
END;
$$;

-- 5. RPC: respond to a join request (accept or deny). Only group leader or admin.
CREATE OR REPLACE FUNCTION public.respond_to_join_request(p_request_id UUID, p_accept BOOLEAN)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_id UUID;
  v_req group_join_requests%ROWTYPE;
  v_is_leader_or_admin BOOLEAN;
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
    SELECT 1 FROM group_members gm WHERE gm.group_id = v_req.group_id AND gm.user_id = v_my_id AND gm.role = 'admin'
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
  SET status = CASE WHEN p_accept THEN 'accepted'::group_join_request_status ELSE 'denied'::group_join_request_status END,
      decided_at = NOW(),
      decided_by = v_my_id
  WHERE id = p_request_id;

  -- Remove the join-request notification so it disappears from the notifications page (whether accepted/denied from group page or notifications page)
  DELETE FROM notifications
  WHERE type = 'group_join_request' AND (data->>'request_id')::UUID = p_request_id AND user_id = v_my_id;
END;
$$;

-- 6. get_group_detail: add pending_requests for leader (and admins)
CREATE OR REPLACE FUNCTION public.get_group_detail(p_group_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_id UUID;
  v_group meal_groups%ROWTYPE;
  v_latest_completed_id UUID;
  v_active_deadline TIMESTAMPTZ;
  v_result jsonb;
  v_pending_requests jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_my_id := public.get_my_profile_id();
  IF v_my_id IS NULL THEN
    RAISE EXCEPTION 'No profile found. Sign in again.';
  END IF;

  IF NOT (public.is_member_of_group(p_group_id)) THEN
    RAISE EXCEPTION 'Not a member of this group';
  END IF;

  SELECT * INTO v_group FROM meal_groups WHERE id = p_group_id LIMIT 1;
  IF v_group.id IS NULL THEN
    RAISE EXCEPTION 'Group not found';
  END IF;

  SELECT id INTO v_latest_completed_id
  FROM voting_sessions
  WHERE group_id = p_group_id AND status = 'completed'
  ORDER BY decided_at DESC NULLS LAST, created_at DESC
  LIMIT 1;

  -- Pending join requests only for leader or admin
  IF v_group.created_by = v_my_id OR EXISTS (SELECT 1 FROM group_members WHERE group_id = p_group_id AND user_id = v_my_id AND role = 'admin') THEN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', gjr.id,
        'group_id', gjr.group_id,
        'user_id', gjr.user_id,
        'status', gjr.status,
        'created_at', gjr.created_at,
        'username', p.username
      ) ORDER BY gjr.created_at DESC
    ), '[]'::jsonb) INTO v_pending_requests
    FROM group_join_requests gjr
    LEFT JOIN profiles p ON p.id = gjr.user_id
    WHERE gjr.group_id = p_group_id AND gjr.status = 'pending';
  ELSE
    v_pending_requests := '[]'::jsonb;
  END IF;

  v_result := jsonb_build_object(
    'group', to_jsonb(v_group),
    'members', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', gm.id,
          'group_id', gm.group_id,
          'user_id', gm.user_id,
          'role', gm.role,
          'joined_at', gm.joined_at,
          'username', p.username
        ) ORDER BY (gm.role = 'admin') DESC, p.username
      ), '[]'::jsonb)
      FROM group_members gm
      LEFT JOIN profiles p ON p.id = gm.user_id
      WHERE gm.group_id = p_group_id
    ),
    'latest_completed_session_id', to_jsonb(v_latest_completed_id),
    'active_session_deadline', to_jsonb(v_active_deadline),
    'pending_requests', v_pending_requests
  );

  RETURN v_result;
END;
$$;
