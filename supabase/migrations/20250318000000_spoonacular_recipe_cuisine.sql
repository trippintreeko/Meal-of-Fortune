-- Add cuisine to spoonacular_recipe_details (from Spoonacular API cuisines array).
-- Populated by spoonacular-match-and-save / spoonacular-dedupe-and-backfill; used for food gallery filter and preferences.

ALTER TABLE public.spoonacular_recipe_details
  ADD COLUMN IF NOT EXISTS cuisine TEXT;

COMMENT ON COLUMN public.spoonacular_recipe_details.cuisine IS 'Primary cuisine from Spoonacular (e.g. Mediterranean, Italian). Used for gallery filter and favorite cuisines.';
