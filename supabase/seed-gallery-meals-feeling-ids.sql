-- Assign feeling_ids to gallery_meals so "How are you feeling?" filters show matching meals.
-- Run after migrations and after gallery_meals seed data. Uses base_group and cooking_method.

UPDATE public.gallery_meals
SET feeling_ids = (
  SELECT COALESCE(array_agg(DISTINCT elem), '{}') FROM (
    SELECT unnest(
      (CASE WHEN base_group IN ('soup', 'chowders', 'bisques', 'broth soups') OR (cooking_method IN ('baked', 'stove', 'boiled', 'steamed') AND base_group IN ('pasta', 'rice', 'bread', 'potato', 'dough', 'legume', 'corn')) THEN ARRAY['warm_me_up', 'hearty', 'comforting', 'cozy'] ELSE ARRAY[]::TEXT[] END) ||
      (CASE WHEN base_group IN ('salad', 'kale caesar', 'cobb salad', 'nicoise salad', 'seaweed', 'seaweed salad', 'nori wraps', 'kelp noodles', 'chia pudding') OR cooking_method = 'raw' THEN ARRAY['cool_me_off', 'light', 'cleansing', 'refreshing'] ELSE ARRAY[]::TEXT[] END) ||
      (CASE WHEN base_group IN ('quinoa', 'seed', 'plant', 'toast') THEN ARRAY['light', 'cleansing'] ELSE ARRAY[]::TEXT[] END) ||
      (CASE WHEN base_group IN ('pasta', 'dough', 'potato', 'legume', 'bread') THEN ARRAY['heavy', 'hearty'] ELSE ARRAY[]::TEXT[] END) ||
      (CASE WHEN base_group IN ('rice', 'potato', 'pasta', 'bread', 'legume', 'soup', 'tortilla') THEN ARRAY['hearty', 'comforting'] ELSE ARRAY[]::TEXT[] END) ||
      (CASE WHEN base_group IN ('legume', 'quinoa', 'potato', 'bread', 'fermented') THEN ARRAY['earthy'] ELSE ARRAY[]::TEXT[] END) ||
      (CASE WHEN base_group IN ('breakfast', 'quinoa', 'rice', 'seed') THEN ARRAY['rejuvenating', 'energy_booster'] ELSE ARRAY[]::TEXT[] END) ||
      (CASE WHEN base_group IN ('breakfast', 'toast', 'bread', 'pasta', 'rice') THEN ARRAY['energy_booster', 'simple'] ELSE ARRAY[]::TEXT[] END) ||
      (CASE WHEN base_group IN ('dessert', 'pasta', 'bread') OR base_group = 'pizza' THEN ARRAY['indulgent'] ELSE ARRAY[]::TEXT[] END) ||
      (CASE WHEN base_group IN ('rice', 'bread', 'toast', 'pasta') THEN ARRAY['simple'] ELSE ARRAY[]::TEXT[] END) ||
      (CASE WHEN base_group IN ('noodles', 'sushi', 'fermented', 'seaweed', 'dough') THEN ARRAY['adventurous'] ELSE ARRAY[]::TEXT[] END)
    ) AS elem
  ) sub
);

-- Ensure every meal has at least one feeling (default to 'simple' if none matched)
UPDATE public.gallery_meals
SET feeling_ids = ARRAY['simple']
WHERE feeling_ids IS NULL OR array_length(feeling_ids, 1) IS NULL;
