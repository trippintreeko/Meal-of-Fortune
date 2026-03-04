-- Address Supabase security lint:
-- 1. RLS disabled on public.food_items
-- 2. voting_history view runs as SECURITY DEFINER (owner); switch to invoker so RLS applies

-- =============================================================================
-- 1. food_items: enable RLS + allow public read (reference/catalog table, no user_id)
-- =============================================================================
ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;

-- Allow anyone (anon + authenticated) to read; no INSERT/UPDATE/DELETE policies
-- so only owner/service role can modify (e.g. seed data).
DROP POLICY IF EXISTS "Allow public read" ON public.food_items;
CREATE POLICY "Allow public read" ON public.food_items
  FOR SELECT
  USING (true);

-- =============================================================================
-- 2. voting_history: recreate with security_invoker so RLS on underlying tables applies
-- =============================================================================
DROP VIEW IF EXISTS public.voting_history;

CREATE VIEW public.voting_history
  WITH (security_invoker = on)
AS
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
