-- Group Voting History Calendar & Auto-Expiration
-- 1. Retention and archive columns; 2. voting_history_view; 3. RPCs; 4. Indexes; 5. Backfill

-- 1a. Retention period on groups (default 6 months, max 1 year)
ALTER TABLE meal_groups
  ADD COLUMN IF NOT EXISTS voting_history_retention_days INTEGER DEFAULT 180
  CHECK (voting_history_retention_days BETWEEN 1 AND 365);

-- 1b. Archive flags on voting_sessions (soft delete)
ALTER TABLE voting_sessions
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_reason TEXT;

-- 2. View for calendar/history (completed or cancelled, not archived)
CREATE OR REPLACE VIEW voting_history_view AS
SELECT
  vs.id,
  vs.group_id,
  vs.status,
  vs.deadline,
  vs.decided_at,
  vs.winner_suggestion_id,
  vs.description,
  vs.scheduled_meal_date,
  vs.scheduled_meal_slot,
  vs.created_at,
  vs.archived_at,
  ms.suggestion AS winner_text,
  p.username AS winner_suggested_by,
  (SELECT COUNT(DISTINCT user_id) FROM votes v WHERE v.session_id = vs.id) AS total_voters,
  (SELECT COUNT(*) FROM votes v WHERE v.session_id = vs.id) AS total_votes,
  (SELECT COUNT(*) FROM meal_suggestions ms2 WHERE ms2.session_id = vs.id) AS total_suggestions
FROM voting_sessions vs
LEFT JOIN meal_suggestions ms ON ms.id = vs.winner_suggestion_id
LEFT JOIN profiles p ON p.id = ms.user_id
WHERE vs.status IN ('completed', 'cancelled')
  AND vs.archived_at IS NULL;

-- 3. Indexes for history and archive queries
CREATE INDEX IF NOT EXISTS idx_voting_sessions_group_created
  ON voting_sessions (group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voting_sessions_archived
  ON voting_sessions (archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_voting_sessions_group_archived_created
  ON voting_sessions (group_id, archived_at, created_at DESC);

-- 4. get_group_voting_history: paginated history for group members
CREATE OR REPLACE FUNCTION public.get_group_voting_history(
  p_group_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_from_date DATE DEFAULT NULL,
  p_to_date DATE DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_id UUID;
  v_total_count BIGINT;
  v_history jsonb;
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

  p_limit := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100);
  p_offset := GREATEST(COALESCE(p_offset, 0), 0);

  SELECT COUNT(*) INTO v_total_count
  FROM voting_sessions vs
  WHERE vs.group_id = p_group_id
    AND vs.status IN ('completed', 'cancelled')
    AND vs.archived_at IS NULL
    AND (p_from_date IS NULL OR vs.decided_at::DATE >= p_from_date OR (vs.decided_at IS NULL AND vs.created_at::DATE >= p_from_date))
    AND (p_to_date IS NULL OR vs.decided_at::DATE <= p_to_date OR (vs.decided_at IS NULL AND vs.created_at::DATE <= p_to_date))
    AND (p_status IS NULL OR vs.status = p_status);

  SELECT COALESCE(jsonb_agg(row ORDER BY COALESCE(row->>'decided_at', row->>'created_at') DESC NULLS LAST), '[]'::jsonb) INTO v_history
  FROM (
    SELECT jsonb_build_object(
      'id', vs.id,
      'group_id', vs.group_id,
      'status', vs.status,
      'deadline', vs.deadline,
      'decided_at', vs.decided_at,
      'winner_suggestion_id', vs.winner_suggestion_id,
      'description', vs.description,
      'scheduled_meal_date', vs.scheduled_meal_date,
      'scheduled_meal_slot', vs.scheduled_meal_slot,
      'created_at', vs.created_at,
      'winner_text', ms.suggestion,
      'winner_suggested_by', p.username,
      'total_voters', (SELECT COUNT(DISTINCT user_id) FROM votes v WHERE v.session_id = vs.id),
      'total_votes', (SELECT COUNT(*) FROM votes v WHERE v.session_id = vs.id),
      'total_suggestions', (SELECT COUNT(*) FROM meal_suggestions ms2 WHERE ms2.session_id = vs.id)
    ) AS row
    FROM voting_sessions vs
    LEFT JOIN meal_suggestions ms ON ms.id = vs.winner_suggestion_id
    LEFT JOIN profiles p ON p.id = ms.user_id
    WHERE vs.group_id = p_group_id
      AND vs.status IN ('completed', 'cancelled')
      AND vs.archived_at IS NULL
      AND (p_from_date IS NULL OR vs.decided_at::DATE >= p_from_date OR (vs.decided_at IS NULL AND vs.created_at::DATE >= p_from_date))
      AND (p_to_date IS NULL OR vs.decided_at::DATE <= p_to_date OR (vs.decided_at IS NULL AND vs.created_at::DATE <= p_to_date))
      AND (p_status IS NULL OR vs.status = p_status)
    ORDER BY COALESCE(vs.decided_at, vs.created_at) DESC NULLS LAST
    LIMIT p_limit
    OFFSET p_offset
  ) sub;

  RETURN jsonb_build_object(
    'total_count', v_total_count,
    'sessions', COALESCE(v_history, '[]'::jsonb)
  );
END;
$$;

-- 5. archive_old_voting_sessions: per-group retention, sets archived_at (for cron)
CREATE OR REPLACE FUNCTION public.archive_old_voting_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_archived_count INTEGER := 0;
  v_group RECORD;
  v_row_count INTEGER;
BEGIN
  FOR v_group IN
    SELECT id, COALESCE(voting_history_retention_days, 180) AS retention_days
    FROM meal_groups
  LOOP
    WITH archived AS (
      UPDATE voting_sessions
      SET archived_at = NOW(),
          archived_reason = 'auto_expired'
      WHERE group_id = v_group.id
        AND status IN ('completed', 'cancelled')
        AND archived_at IS NULL
        AND (decided_at IS NOT NULL AND decided_at < (NOW() - (v_group.retention_days || ' days')::INTERVAL)
             OR decided_at IS NULL AND created_at < (NOW() - (v_group.retention_days || ' days')::INTERVAL))
      RETURNING id
    )
    SELECT COUNT(*)::INTEGER INTO v_row_count FROM archived;
    v_archived_count := v_archived_count + v_row_count;
  END LOOP;

  RETURN v_archived_count;
END;
$$;

-- 6. purge_archived_voting_sessions: delete sessions archived > 30 days ago (for cron)
CREATE OR REPLACE FUNCTION public.purge_archived_voting_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER := 0;
BEGIN
  WITH deleted AS (
    DELETE FROM voting_sessions
    WHERE archived_at IS NOT NULL
      AND archived_at < (NOW() - INTERVAL '30 days')
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER INTO v_deleted_count FROM deleted;

  RETURN v_deleted_count;
END;
$$;

-- 7. update_group_voting_retention: admin-only, set retention days
CREATE OR REPLACE FUNCTION public.update_group_voting_retention(
  p_group_id UUID,
  p_retention_days INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_id UUID;
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

  IF NOT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = v_my_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only a group admin can change history retention';
  END IF;

  p_retention_days := LEAST(365, GREATEST(1, COALESCE(p_retention_days, 180)));

  UPDATE meal_groups
  SET voting_history_retention_days = p_retention_days
  WHERE id = p_group_id;
END;
$$;

-- 8. Backfill: archive existing sessions older than retention (180 days for all groups)
UPDATE voting_sessions vs
SET archived_at = NOW(),
    archived_reason = 'auto_expired'
WHERE vs.status IN ('completed', 'cancelled')
  AND vs.archived_at IS NULL
  AND (
    (vs.decided_at IS NOT NULL AND vs.decided_at < (NOW() - INTERVAL '180 days'))
    OR (vs.decided_at IS NULL AND vs.created_at < (NOW() - INTERVAL '180 days'))
  );
