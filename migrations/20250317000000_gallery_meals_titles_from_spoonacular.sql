-- Set gallery_meals.title to Spoonacular recipe title where we have a match.
-- Run after spoonacular-match-and-save has populated spoonacular_recipe_details.

UPDATE public.gallery_meals g
SET title = r.title
FROM public.spoonacular_recipe_details r
WHERE g.spoonacular_recipe_id = r.spoonacular_recipe_id
  AND r.title IS NOT NULL
  AND r.title <> '';
