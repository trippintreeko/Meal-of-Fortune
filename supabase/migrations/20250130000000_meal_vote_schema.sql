-- Meal Vote: Enums
CREATE TYPE friendship_status AS ENUM ('pending', 'accepted', 'blocked');
CREATE TYPE group_member_role AS ENUM ('member', 'admin');
CREATE TYPE session_status AS ENUM ('active', 'completed', 'cancelled');
CREATE TYPE price_range_type AS ENUM ('$', '$$', '$$$', '$$$$');
CREATE TYPE notification_type AS ENUM (
  'friend_request',
  'suggestion_added',
  'vote_cast',
  'deadline_approaching',
  'result_ready',
  'group_invite'
);

-- 1. USER PROFILES
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  username TEXT NOT NULL,
  friend_code VARCHAR(9) UNIQUE,
  email TEXT,
  avatar_url TEXT,
  dietary_restrictions TEXT[] DEFAULT '{}',
  favorite_cuisines TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX users_username_lower ON users (LOWER(username));

-- 2. FRIEND RELATIONSHIPS
CREATE TABLE friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status friendship_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

CREATE INDEX idx_friendships_user_id ON friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX idx_friendships_status ON friendships(status);

-- 3. MEAL GROUPS
CREATE TABLE meal_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  group_code VARCHAR(10) UNIQUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  active_voting_session UUID
);

CREATE INDEX idx_meal_groups_group_code ON meal_groups(group_code);
CREATE INDEX idx_meal_groups_created_by ON meal_groups(created_by);

-- 4. GROUP MEMBERS (active_voting_session on meal_groups has no FK to avoid circular ref)
CREATE TABLE group_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES meal_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role group_member_role DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);

-- 5. VOTING SESSIONS (without winner_suggestion_id FK first)
CREATE TABLE voting_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES meal_groups(id) ON DELETE CASCADE,
  initiated_by UUID REFERENCES users(id),
  status session_status DEFAULT 'active',
  deadline TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  winner_suggestion_id UUID,
  decided_at TIMESTAMPTZ
);

CREATE INDEX idx_voting_sessions_group_id ON voting_sessions(group_id);
CREATE INDEX idx_voting_sessions_status ON voting_sessions(status);
CREATE INDEX idx_voting_sessions_deadline ON voting_sessions(deadline);

-- 6. MEAL SUGGESTIONS (location as JSONB to avoid PostGIS)
CREATE TABLE meal_suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES voting_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  suggestion TEXT NOT NULL,
  category VARCHAR(50),
  price_range price_range_type,
  dietary_tags TEXT[] DEFAULT '{}',
  location JSONB,
  vote_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE voting_sessions ADD CONSTRAINT fk_winner_suggestion
  FOREIGN KEY (winner_suggestion_id) REFERENCES meal_suggestions(id);

CREATE INDEX idx_meal_suggestions_session_id ON meal_suggestions(session_id);
CREATE INDEX idx_meal_suggestions_user_id ON meal_suggestions(user_id);

-- 7. USER VOTES
CREATE TABLE votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES voting_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  suggestion_id UUID NOT NULL REFERENCES meal_suggestions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

CREATE INDEX idx_votes_session_id ON votes(session_id);
CREATE INDEX idx_votes_suggestion_id ON votes(suggestion_id);

-- Keep meal_suggestions.vote_count in sync
CREATE OR REPLACE FUNCTION public.update_suggestion_vote_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE meal_suggestions SET vote_count = vote_count + 1 WHERE id = NEW.suggestion_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE meal_suggestions SET vote_count = GREATEST(0, vote_count - 1) WHERE id = OLD.suggestion_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER votes_count_trigger AFTER INSERT OR DELETE ON votes
  FOR EACH ROW EXECUTE FUNCTION public.update_suggestion_vote_count();

-- 8. NOTIFICATIONS
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);

-- 9. Voting history view
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
  u.username AS initiated_by_name,
  ms.suggestion AS winning_meal,
  ms.category AS winning_category
FROM voting_sessions vs
JOIN meal_groups mg ON vs.group_id = mg.id
LEFT JOIN users u ON vs.initiated_by = u.id
LEFT JOIN meal_suggestions ms ON vs.winner_suggestion_id = ms.id
WHERE vs.status = 'completed';

-- Helper: generate unique friend code (called from trigger or app)
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
    IF NOT EXISTS (SELECT 1 FROM users WHERE friend_code = code) THEN
      RETURN code;
    END IF;
    n := n + 1;
    IF n > 100 THEN
      RAISE EXCEPTION 'Could not generate unique friend code';
    END IF;
  END LOOP;
END;
$$;

-- Trigger: update users.updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger: create user profile on auth signup
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
  INSERT INTO public.users (auth_id, username, friend_code, email)
  VALUES (NEW.id, uname, fcode, NEW.email)
  ON CONFLICT (auth_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RPC: join group by code (returns group_id or error)
-- RPC: get group by code (for validation)
CREATE OR REPLACE FUNCTION public.get_group_by_code(p_code TEXT)
RETURNS TABLE(id UUID, name TEXT, group_code VARCHAR(10))
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT mg.id, mg.name, mg.group_code
  FROM meal_groups mg
  WHERE UPPER(TRIM(mg.group_code)) = UPPER(TRIM(p_code))
  LIMIT 1;
END;
$$;

-- RPC: join group by code
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
  v_user_id := (SELECT id FROM users WHERE auth_id = auth.uid());
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

-- RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE voting_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- USERS
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth_id = auth.uid());

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth_id = auth.uid());

CREATE POLICY "Friends can view basic user info" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM friendships f
      WHERE ((f.user_id = id AND f.friend_id = (SELECT id FROM users WHERE auth_id = auth.uid()))
             OR (f.friend_id = id AND f.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())))
      AND f.status = 'accepted'
    )
  );

-- Service role can insert via trigger; no direct user insert needed (trigger does it)
CREATE POLICY "Allow insert for auth trigger" ON users
  FOR INSERT WITH CHECK (auth_id = auth.uid() OR auth.uid() IS NULL);

-- FRIENDSHIPS
CREATE POLICY "Users can manage own friendships" ON friendships
  FOR ALL USING (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    OR friend_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- MEAL_GROUPS: members can view and update (for active_voting_session); creators can insert
CREATE POLICY "Group members can view group" ON meal_groups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = id AND gm.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

CREATE POLICY "Group members can update group" ON meal_groups
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = id AND gm.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

CREATE POLICY "Authenticated users can create group" ON meal_groups
  FOR INSERT WITH CHECK (
    created_by = (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- GROUP_MEMBERS
CREATE POLICY "Group members can view members" ON group_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id AND gm.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

CREATE POLICY "Admins can manage members" ON group_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
        AND gm.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
        AND gm.role = 'admin'
    )
  );

-- Allow self-insert via RPC join_group_by_code (SECURITY DEFINER does not use RLS for the insert)
-- So we need a policy that allows insert when user_id = current user (for join by code).
CREATE POLICY "Users can join group (self insert)" ON group_members
  FOR INSERT WITH CHECK (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

-- VOTING_SESSIONS
CREATE POLICY "Group members can view sessions" ON voting_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = voting_sessions.group_id AND gm.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

CREATE POLICY "Group members can create session" ON voting_sessions
  FOR INSERT WITH CHECK (
    initiated_by = (SELECT id FROM users WHERE auth_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = voting_sessions.group_id AND gm.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

CREATE POLICY "Group members can update session" ON voting_sessions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = voting_sessions.group_id AND gm.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

-- MEAL_SUGGESTIONS
CREATE POLICY "Group members can view suggestions" ON meal_suggestions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM voting_sessions vs
      JOIN group_members gm ON gm.group_id = vs.group_id
      WHERE vs.id = meal_suggestions.session_id AND gm.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

CREATE POLICY "Group members can add suggestions" ON meal_suggestions
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM voting_sessions vs
      JOIN group_members gm ON gm.group_id = vs.group_id
      WHERE vs.id = session_id AND vs.status = 'active' AND gm.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

-- VOTES
CREATE POLICY "Group members can view votes" ON votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM voting_sessions vs
      JOIN group_members gm ON gm.group_id = vs.group_id
      WHERE vs.id = votes.session_id AND gm.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

CREATE POLICY "Group members can cast vote" ON votes
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM voting_sessions vs
      JOIN group_members gm ON gm.group_id = vs.group_id
      WHERE vs.id = session_id AND vs.status = 'active' AND gm.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete own vote" ON votes
  FOR DELETE USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can update own vote" ON votes
  FOR UPDATE USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

-- NOTIFICATIONS
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can update own notifications (mark read)" ON notifications
  FOR UPDATE USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Notifications are inserted by backend/triggers; allow service role or a policy for other users to create (e.g. vote_cast from another user)
CREATE POLICY "Allow insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- Realtime: enable for live vote and suggestion updates
ALTER PUBLICATION supabase_realtime ADD TABLE meal_suggestions;
ALTER PUBLICATION supabase_realtime ADD TABLE votes;
