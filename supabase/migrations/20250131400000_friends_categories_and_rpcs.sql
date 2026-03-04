-- Friends management: categories and RPCs (uses existing friendships table).

-- 1. Add updated_at to friendships if missing (for status updates)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'friendships' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE friendships ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- 2. Friend categories (user-scoped labels)
CREATE TABLE IF NOT EXISTS friend_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#64748b',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_friend_categories_user_id ON friend_categories(user_id);

-- 3. Friend-to-category mapping
CREATE TABLE IF NOT EXISTS friend_category_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES friend_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_fcm_user_friend ON friend_category_memberships(user_id, friend_id);
CREATE INDEX IF NOT EXISTS idx_fcm_category ON friend_category_memberships(category_id);

-- RLS
ALTER TABLE friend_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_category_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own categories" ON friend_categories;
CREATE POLICY "Users manage own categories" ON friend_categories
  FOR ALL USING (user_id = public.get_my_profile_id());

DROP POLICY IF EXISTS "Users manage own category memberships" ON friend_category_memberships;
CREATE POLICY "Users manage own category memberships" ON friend_category_memberships
  FOR ALL USING (user_id = public.get_my_profile_id());

-- 4. get_my_friends: all friends with status and categories (one row per friend; pending if any row is pending)
-- Use SECURITY INVOKER so RLS and get_my_profile_id() run as the authenticated user (JWT), not the function owner.
CREATE OR REPLACE FUNCTION public.get_my_friends()
RETURNS TABLE (
  friend_id UUID,
  username TEXT,
  friend_code TEXT,
  status TEXT,
  categories JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_my_id UUID;
BEGIN
  v_my_id := public.get_my_profile_id();
  IF v_my_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found. Sign out and sign in again.';
  END IF;

  RETURN QUERY
  SELECT
    p.id::UUID,
    p.username::TEXT,
    p.friend_code::TEXT,
    (CASE WHEN bool_or(fr.status = 'pending') THEN 'pending' ELSE 'accepted' END)::TEXT,
    (COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('id', fc.id, 'name', fc.name, 'color', fc.color))
       FROM friend_category_memberships fcm
       JOIN friend_categories fc ON fc.id = fcm.category_id AND fc.user_id = v_my_id
       WHERE fcm.user_id = v_my_id AND fcm.friend_id = p.id),
      '[]'::jsonb
    ))::JSONB,
    (MIN(fr.created_at))::TIMESTAMPTZ
  FROM friendships fr
  JOIN profiles p ON (
    (fr.user_id = v_my_id AND fr.friend_id = p.id) OR
    (fr.friend_id = v_my_id AND fr.user_id = p.id)
  )
  WHERE (fr.user_id = v_my_id OR fr.friend_id = v_my_id)
    AND fr.status IN ('accepted', 'pending')
  GROUP BY p.id, p.username, p.friend_code
  ORDER BY bool_or(fr.status = 'pending') DESC, p.username;
END;
$$;

-- 5. update_friend_status: accept or deny pending request (deny = delete or set blocked)
CREATE OR REPLACE FUNCTION public.update_friend_status(p_friend_id UUID, p_status TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_id UUID;
BEGIN
  v_my_id := public.get_my_profile_id();
  IF v_my_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_status NOT IN ('accepted', 'blocked') THEN
    RAISE EXCEPTION 'Invalid status. Use accepted or blocked.';
  END IF;

  UPDATE friendships
  SET status = p_status::friendship_status,
      updated_at = NOW()
  WHERE ((user_id = v_my_id AND friend_id = p_friend_id) OR (friend_id = v_my_id AND user_id = p_friend_id))
    AND status = 'pending';
END;
$$;

-- 6. remove_friend: delete friendship row
CREATE OR REPLACE FUNCTION public.remove_friend(p_friend_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_id UUID;
BEGIN
  v_my_id := public.get_my_profile_id();
  IF v_my_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  DELETE FROM friendships
  WHERE (user_id = v_my_id AND friend_id = p_friend_id) OR (friend_id = v_my_id AND user_id = p_friend_id);
END;
$$;

-- 7. create_group_from_friends: create meal group, add me as admin, add friends as members, notify
CREATE OR REPLACE FUNCTION public.create_group_from_friends(p_group_name TEXT, p_friend_ids UUID[])
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_id UUID;
  v_group_id UUID;
  v_group_name TEXT;
  v_code TEXT;
  v_fid UUID;
BEGIN
  v_my_id := public.get_my_profile_id();
  IF v_my_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  v_group_name := COALESCE(NULLIF(TRIM(p_group_name), ''), 'New Group');
  v_code := 'GRP-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 6));

  INSERT INTO meal_groups (name, group_code, created_by)
  VALUES (v_group_name, v_code, v_my_id)
  RETURNING id INTO v_group_id;

  INSERT INTO group_members (group_id, user_id, role)
  VALUES (v_group_id, v_my_id, 'admin');

  FOR v_fid IN SELECT unnest(p_friend_ids)
  LOOP
    IF v_fid = v_my_id THEN CONTINUE; END IF;
    IF EXISTS (
      SELECT 1 FROM friendships fr
      WHERE ((fr.user_id = v_my_id AND fr.friend_id = v_fid) OR (fr.friend_id = v_my_id AND fr.user_id = v_fid))
        AND fr.status = 'accepted'
    ) THEN
      INSERT INTO group_members (group_id, user_id, role)
      VALUES (v_group_id, v_fid, 'member')
      ON CONFLICT (group_id, user_id) DO NOTHING;

      INSERT INTO notifications (user_id, type, title, body, data)
      VALUES (v_fid, 'group_invite', 'New group invitation', 'You were added to the group: ' || v_group_name, jsonb_build_object('group_id', v_group_id));
    END IF;
  END LOOP;

  RETURN v_group_id;
END;
$$;

-- 8. Category CRUD RPCs (optional; app can use direct table insert/update with RLS)
-- Ensure trigger for updated_at on friendships
CREATE OR REPLACE FUNCTION public.set_friendship_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS friendships_updated_at ON friendships;
CREATE TRIGGER friendships_updated_at
  BEFORE UPDATE ON friendships
  FOR EACH ROW EXECUTE PROCEDURE public.set_friendship_updated_at();
