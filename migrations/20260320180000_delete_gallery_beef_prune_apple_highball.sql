-- Remove two gallery meals that were mismatched / duplicate-prone (Mar 2026 cleanup).
-- Matches normalized title so minor whitespace differences still hit.

DELETE FROM public.gallery_meals
WHERE lower(regexp_replace(trim(title), '\s+', ' ', 'g')) IN (
  'beef and prune casserole',
  'apple highball'
);
