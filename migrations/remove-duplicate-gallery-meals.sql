-- =============================================================================
-- Remove duplicate rows from gallery_meals (same title, description, base_id,
-- protein_id, vegetable_id, cooking_method, meal_type, base_group, sort_order).
-- Keeps one row per group (the one with the smallest id).
-- Run in Supabase Dashboard → SQL Editor.
-- =============================================================================

-- 1) Optional: see how many duplicates exist (run first to confirm)
-- SELECT title, description, base_id, protein_id, vegetable_id, cooking_method, meal_type, base_group, sort_order, COUNT(*) AS n
-- FROM gallery_meals
-- GROUP BY title, description, base_id, protein_id, vegetable_id, cooking_method, meal_type, base_group, sort_order
-- HAVING COUNT(*) > 1;

-- 2) Delete duplicates (keep one row per unique content; keeps the row with smallest id)
DELETE FROM public.gallery_meals a
USING public.gallery_meals b
WHERE a.title = b.title
  AND (a.description IS NOT DISTINCT FROM b.description)
  AND (a.base_id IS NOT DISTINCT FROM b.base_id)
  AND (a.protein_id IS NOT DISTINCT FROM b.protein_id)
  AND (a.vegetable_id IS NOT DISTINCT FROM b.vegetable_id)
  AND (a.cooking_method IS NOT DISTINCT FROM b.cooking_method)
  AND (a.meal_type IS NOT DISTINCT FROM b.meal_type)
  AND (a.base_group IS NOT DISTINCT FROM b.base_group)
  AND (a.sort_order IS NOT DISTINCT FROM b.sort_order)
  AND a.id > b.id;

-- 3) Optional: add a unique constraint so duplicates cannot be re-inserted
-- (Uncomment to run after the delete. Adjust column list if you prefer a different uniqueness rule.)
-- ALTER TABLE public.gallery_meals
--   ADD CONSTRAINT gallery_meals_content_unique UNIQUE (
--     title,
--     description,
--     base_id,
--     protein_id,
--     vegetable_id,
--     cooking_method,
--     meal_type,
--     base_group,
--     sort_order
--   );
