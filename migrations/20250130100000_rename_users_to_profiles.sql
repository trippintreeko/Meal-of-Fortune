-- Fix 500 on /rest/v1/users: PostgREST can conflict with public "users" table.
-- Rename to "profiles" (Supabase convention) and update all references.
-- Safe to run again: only renames if "users" still exists.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
    ALTER TABLE users RENAME TO profiles;
    ALTER TRIGGER users_updated_at ON profiles RENAME TO profiles_updated_at;
  END IF;
END $$;

-- Trigger function: insert into profiles on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uname TEXT;
  fcode TEXT;
BEGIN
  uname := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
    NULLIF(SPLIT_PART(NEW.email, '@', 1), ''),
    'user'
  );
  uname := uname || '_' || SUBSTRING(REPLACE(NEW.id::TEXT, '-', '') FROM 1 FOR 6);
  fcode := public.generate_friend_code(COALESCE(NEW.raw_user_meta_data->>'username', 'USR'));
  INSERT INTO public.profiles (auth_id, username, friend_code, email)
  VALUES (NEW.id, uname, fcode, NEW.email)
  ON CONFLICT (auth_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- generate_friend_code: reference profiles
CREATE OR REPLACE FUNCTION public.generate_friend_code(p_prefix TEXT DEFAULT 'USR')
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefix TEXT;
  code TEXT;
  n INT := 0;
BEGIN
  prefix := UPPER(SUBSTRING(REGEXP_REPLACE(COALESCE(p_prefix, 'USR'), '[^A-Za-z0-9]', '', 'g') FROM 1 FOR 3));
  IF LENGTH(prefix) < 3 THEN
    prefix := RPAD(prefix, 3, 'X');
  END IF;
  LOOP
    code := prefix || '-' || LPAD(FLOOR(1000 + RANDOM() * 9000)::TEXT, 4, '0');
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE friend_code = code) THEN
      RETURN code;
    END IF;
    n := n + 1;
    IF n > 100 THEN
      RAISE EXCEPTION 'Could not generate unique friend code';
    END IF;
  END LOOP;
END;
$$;

-- join_group_by_code: reference profiles
CREATE OR REPLACE FUNCTION public.join_group_by_code(p_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := (SELECT id FROM profiles WHERE auth_id = auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT id INTO v_group_id FROM meal_groups WHERE UPPER(TRIM(group_code)) = UPPER(TRIM(p_code)) LIMIT 1;
  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'Invalid group code';
  END IF;
  INSERT INTO group_members (group_id, user_id, role)
  VALUES (v_group_id, v_user_id, 'member')
  ON CONFLICT (group_id, user_id) DO NOTHING;
  RETURN v_group_id;
END;
$$;

-- View voting_history: reference profiles
DROP VIEW IF EXISTS voting_history;
CREATE VIEW voting_history AS
SELECT
  vs.id,
  vs.group_id,
  vs.initiated_by,
  vs.status,
  vs.deadline,
  vs.created_at,
  vs.winner_suggestion_id,
  vs.decided_at,
  mg.name AS group_name,
  p.username AS initiated_by_name,
  ms.suggestion AS winning_meal,
  ms.category AS winning_category
FROM voting_sessions vs
JOIN meal_groups mg ON vs.group_id = mg.id
LEFT JOIN profiles p ON vs.initiated_by = p.id
LEFT JOIN meal_suggestions ms ON vs.winner_suggestion_id = ms.id
WHERE vs.status = 'completed';

-- RLS: drop policies on profiles that reference "users" in subqueries, recreate with "profiles"
-- "Friends can view basic user info" references users in subquery
DROP POLICY IF EXISTS "Friends can view basic user info" ON profiles;
CREATE POLICY "Friends can view basic user info" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM friendships f
      WHERE ((f.user_id = id AND f.friend_id = (SELECT id FROM profiles WHERE auth_id = auth.uid()))
             OR (f.friend_id = id AND f.user_id = (SELECT id FROM profiles WHERE auth_id = auth.uid())))
      AND f.status = 'accepted'
    )
  );

-- Policies on other tables that reference users -> profiles
DROP POLICY IF EXISTS "Users can manage own friendships" ON friendships;
CREATE POLICY "Users can manage own friendships" ON friendships
  FOR ALL USING (
    user_id = (SELECT id FROM profiles WHERE auth_id = auth.uid())
    OR friend_id = (SELECT id FROM profiles WHERE auth_id = auth.uid())
  );

DROP POLICY IF EXISTS "Group members can view group" ON meal_groups;
CREATE POLICY "Group members can view group" ON meal_groups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = id AND gm.user_id = (SELECT id FROM profiles WHERE auth_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Group members can update group" ON meal_groups;
CREATE POLICY "Group members can update group" ON meal_groups
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = id AND gm.user_id = (SELECT id FROM profiles WHERE auth_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authenticated users can create group" ON meal_groups;
CREATE POLICY "Authenticated users can create group" ON meal_groups
  FOR INSERT WITH CHECK (
    created_by = (SELECT id FROM profiles WHERE auth_id = auth.uid())
  );

DROP POLICY IF EXISTS "Group members can view members" ON group_members;
CREATE POLICY "Group members can view members" ON group_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id AND gm.user_id = (SELECT id FROM profiles WHERE auth_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can manage members" ON group_members;
CREATE POLICY "Admins can manage members" ON group_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
        AND gm.user_id = (SELECT id FROM profiles WHERE auth_id = auth.uid())
        AND gm.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can join group (self insert)" ON group_members;
CREATE POLICY "Users can join group (self insert)" ON group_members
  FOR INSERT WITH CHECK (user_id = (SELECT id FROM profiles WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Group members can view sessions" ON voting_sessions;
CREATE POLICY "Group members can view sessions" ON voting_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = voting_sessions.group_id AND gm.user_id = (SELECT id FROM profiles WHERE auth_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Group members can create session" ON voting_sessions;
CREATE POLICY "Group members can create session" ON voting_sessions
  FOR INSERT WITH CHECK (
    initiated_by = (SELECT id FROM profiles WHERE auth_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = voting_sessions.group_id AND gm.user_id = (SELECT id FROM profiles WHERE auth_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Group members can update session" ON voting_sessions;
CREATE POLICY "Group members can update session" ON voting_sessions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = voting_sessions.group_id AND gm.user_id = (SELECT id FROM profiles WHERE auth_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Group members can view suggestions" ON meal_suggestions;
CREATE POLICY "Group members can view suggestions" ON meal_suggestions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM voting_sessions vs
      JOIN group_members gm ON gm.group_id = vs.group_id
      WHERE vs.id = meal_suggestions.session_id AND gm.user_id = (SELECT id FROM profiles WHERE auth_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Group members can add suggestions" ON meal_suggestions;
CREATE POLICY "Group members can add suggestions" ON meal_suggestions
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM profiles WHERE auth_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM voting_sessions vs
      JOIN group_members gm ON gm.group_id = vs.group_id
      WHERE vs.id = session_id AND vs.status = 'active' AND gm.user_id = (SELECT id FROM profiles WHERE auth_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Group members can view votes" ON votes;
CREATE POLICY "Group members can view votes" ON votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM voting_sessions vs
      JOIN group_members gm ON gm.group_id = vs.group_id
      WHERE vs.id = votes.session_id AND gm.user_id = (SELECT id FROM profiles WHERE auth_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Group members can cast vote" ON votes;
CREATE POLICY "Group members can cast vote" ON votes
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM profiles WHERE auth_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM voting_sessions vs
      JOIN group_members gm ON gm.group_id = vs.group_id
      WHERE vs.id = session_id AND vs.status = 'active' AND gm.user_id = (SELECT id FROM profiles WHERE auth_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete own vote" ON votes;
CREATE POLICY "Users can delete own vote" ON votes
  FOR DELETE USING (user_id = (SELECT id FROM profiles WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own vote" ON votes;
CREATE POLICY "Users can update own vote" ON votes
  FOR UPDATE USING (user_id = (SELECT id FROM profiles WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id = (SELECT id FROM profiles WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own notifications (mark read)" ON notifications;
CREATE POLICY "Users can update own notifications (mark read)" ON notifications
  FOR UPDATE USING (user_id = (SELECT id FROM profiles WHERE auth_id = auth.uid()));

-- Realtime: expose profiles (optional; add if you use Realtime for profile changes)
-- ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
