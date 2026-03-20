-- Add cuisine to gallery_meals and map from Spoonacular recipe details + title fallback.
-- Used by food gallery filter/sort and kept in sync with lib/cuisines.ts (CUISINE_OPTIONS).

ALTER TABLE public.gallery_meals
  ADD COLUMN IF NOT EXISTS cuisine TEXT;

COMMENT ON COLUMN public.gallery_meals.cuisine IS 'Primary cuisine (e.g. Italian, Thai). From spoonacular_recipe_details or inferred from title. Matches CUISINE_OPTIONS in lib/cuisines.ts.';

-- 1) Backfill from spoonacular_recipe_details where we have a match
UPDATE public.gallery_meals g
SET cuisine = r.cuisine
FROM public.spoonacular_recipe_details r
WHERE g.spoonacular_recipe_id = r.spoonacular_recipe_id
  AND r.cuisine IS NOT NULL
  AND trim(r.cuisine) <> '';

-- 2) For rows still without cuisine, infer from title (canonical names only)
UPDATE public.gallery_meals
SET cuisine = CASE
  WHEN title ~* '\m(Eastern European|Latin American|Middle Eastern|African|American|Cajun|Caribbean|Chinese|French|German|Greek|Indian|Irish|Italian|Japanese|Jewish|Korean|Mediterranean|Mexican|Nordic|Southern|Spanish|Thai|Vietnamese)\M' THEN
    (regexp_match(title, '(Eastern European|Latin American|Middle Eastern|African|American|Cajun|Caribbean|Chinese|French|German|Greek|Indian|Irish|Italian|Japanese|Jewish|Korean|Mediterranean|Mexican|Nordic|Southern|Spanish|Thai|Vietnamese)', 'i'))[1]
  WHEN title ILIKE '%Thai%' THEN 'Thai'
  WHEN title ILIKE '%Japanese%' OR title ILIKE '%Sushi%' OR title ILIKE '%Ramen%' OR title ILIKE '%Udon%' OR title ILIKE '%Soba%' OR title ILIKE '%Teriyaki%' OR title ILIKE '%Okonomiyaki%' OR title ILIKE '%Tempura%' THEN 'Japanese'
  WHEN title ILIKE '%Italian%' OR title ILIKE '%Pasta%' OR title ILIKE '%Risotto%' OR title ILIKE '%Pizza%' OR title ILIKE '%Bruschetta%' OR title ILIKE '%Carbonara%' OR title ILIKE '%Bolognese%' OR title ILIKE '%Parmesan%' OR title ILIKE '%Alfredo%' OR title ILIKE '%Caprese%' OR title ILIKE '%Focaccia%' OR title ILIKE '%Tiramisu%' THEN 'Italian'
  WHEN title ILIKE '%Mexican%' OR title ILIKE '%Taco%' OR title ILIKE '%Burrito%' OR title ILIKE '%Enchilada%' OR title ILIKE '%Quesadilla%' OR title ILIKE '%Guacamole%' OR title ILIKE '%Chilaquiles%' OR title ILIKE '%Tamale%' OR title ILIKE '%Ceviche%' OR title ILIKE '%Pozole%' THEN 'Mexican'
  WHEN title ILIKE '%Indian%' OR title ILIKE '%Curry%' OR title ILIKE '%Biryani%' OR title ILIKE '%Dal %' OR title ILIKE '%Tandoori%' OR title ILIKE '%Masala%' OR title ILIKE '%Naan%' OR title ILIKE '%Samosas%' OR title ILIKE '%Chana%' OR title ILIKE '%Palak%' OR title ILIKE '%Rogan%' THEN 'Indian'
  WHEN title ILIKE '%Chinese%' OR title ILIKE '%Lo Mein%' OR title ILIKE '%Chow Mein%' OR title ILIKE '%Fried Rice%' OR title ILIKE '%Dim Sum%' OR title ILIKE '%Congee%' OR title ILIKE '%Dan Dan%' THEN 'Chinese'
  WHEN title ILIKE '%Korean%' OR title ILIKE '%Bibimbap%' OR title ILIKE '%Kimchi%' OR title ILIKE '%Japchae%' OR title ILIKE '%Bulgogi%' THEN 'Korean'
  WHEN title ILIKE '%Vietnamese%' OR title ILIKE '%Pho%' OR title ILIKE '%Banh Mi%' OR title ILIKE '%Spring Roll%' OR title ILIKE '%Bun %' THEN 'Vietnamese'
  WHEN title ILIKE '%Greek%' OR title ILIKE '%Gyro%' OR title ILIKE '%Tzatziki%' OR title ILIKE '%Feta%' OR title ILIKE '%Baklava%' THEN 'Greek'
  WHEN title ILIKE '%French%' OR title ILIKE '%Croque%' OR title ILIKE '%Crepe%' OR title ILIKE '%Quiche%' OR title ILIKE '%Confit%' OR title ILIKE '%Benedict%' OR title ILIKE '%Fondue%' THEN 'French'
  WHEN title ILIKE '%Spanish%' OR title ILIKE '%Paella%' OR title ILIKE '%Tortilla%' OR title ILIKE '%Tapas%' OR title ILIKE '%Churros%' OR title ILIKE '%Gazpacho%' THEN 'Spanish'
  WHEN title ILIKE '%Mediterranean%' OR title ILIKE '%Hummus%' OR title ILIKE '%Falafel%' OR title ILIKE '%Shawarma%' OR title ILIKE '%Tabbouleh%' THEN 'Mediterranean'
  WHEN title ILIKE '%Middle Eastern%' OR title ILIKE '%Za''atar%' OR title ILIKE '%Manakish%' OR title ILIKE '%Kofta%' OR title ILIKE '%Mujadara%' THEN 'Middle Eastern'
  WHEN title ILIKE '%Caribbean%' OR title ILIKE '%Jerk%' OR title ILIKE '%Jamaican%' OR title ILIKE '%Rice & Peas%' THEN 'Caribbean'
  WHEN title ILIKE '%American%' OR title ILIKE '%Pancakes%' OR title ILIKE '%Biscuits%' OR title ILIKE '%BLT%' OR title ILIKE '%Clam Chowder%' THEN 'American'
  WHEN title ILIKE '%Cajun%' OR title ILIKE '%Jambalaya%' OR title ILIKE '%Gumbo%' OR title ILIKE '%Dirty Rice%' THEN 'Cajun'
  WHEN title ILIKE '%Brazilian%' OR title ILIKE '%Feijoada%' OR title ILIKE '%Pão de Queijo%' THEN 'Latin American'
  WHEN title ILIKE '%Ethiopian%' OR title ILIKE '%Injera%' OR title ILIKE '%Berbere%' THEN 'African'
  WHEN title ILIKE '%Lebanese%' OR title ILIKE '%Fattoush%' OR title ILIKE '%Falafel%' THEN 'Middle Eastern'
  WHEN title ILIKE '%Turkish%' OR title ILIKE '%Menemen%' OR title ILIKE '%Shakshuka%' THEN 'Mediterranean'
  WHEN title ILIKE '%Moroccan%' OR title ILIKE '%Tagine%' OR title ILIKE '%Couscous%' THEN 'African'
  WHEN title ILIKE '%Filipino%' OR title ILIKE '%Peruvian%' OR title ILIKE '%Arroz con Pollo%' THEN 'Latin American'
  ELSE NULL
END
WHERE cuisine IS NULL OR trim(cuisine) = '';

-- Normalize to canonical casing (first letter upper, rest lower) for cuisines we set from title
-- so they match CUISINE_OPTIONS (e.g. "italian" -> "Italian")
UPDATE public.gallery_meals
SET cuisine = initcap(lower(trim(cuisine)))
WHERE cuisine IS NOT NULL
  AND cuisine <> initcap(lower(trim(cuisine)));

-- Fix multi-word canonical names that initcap would wrong (e.g. "Middle eastern" -> "Middle Eastern")
UPDATE public.gallery_meals SET cuisine = 'Eastern European' WHERE cuisine = 'Eastern european';
UPDATE public.gallery_meals SET cuisine = 'Latin American' WHERE cuisine = 'Latin american';
UPDATE public.gallery_meals SET cuisine = 'Middle Eastern' WHERE cuisine = 'Middle eastern';

CREATE INDEX IF NOT EXISTS idx_gallery_meals_cuisine ON public.gallery_meals(cuisine) WHERE cuisine IS NOT NULL;
