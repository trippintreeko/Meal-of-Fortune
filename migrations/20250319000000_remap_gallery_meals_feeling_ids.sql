-- Remap gallery_meals.feeling_ids so "How are you feeling?" shows meals that match each vibe.
-- Uses base_group, cooking_method, and title to assign feelings that make sense
-- (e.g. soups/stews/warm dishes → warm_me_up; salads/raw/cold → cool_me_off).

UPDATE public.gallery_meals
SET feeling_ids = (
  SELECT COALESCE(array_agg(DISTINCT elem), '{}')
  FROM (
    SELECT unnest(
      -- Warm me up: soups, stews, hot cooked dishes (boiled, steamed, baked, stove, slow_cook, pressure_cook)
      (CASE
        WHEN base_group = 'soup' THEN ARRAY['warm_me_up', 'comforting', 'cozy', 'hearty']
        WHEN cooking_method IN ('boiled', 'boil', 'steamed', 'steam', 'baked', 'bake', 'stove', 'grilled', 'grill', 'slow_cook', 'pressure_cook') AND base_group IN ('rice', 'pasta', 'bread', 'potato', 'legume', 'corn', 'dough', 'quinoa', 'tortilla') THEN ARRAY['warm_me_up', 'hearty', 'comforting', 'cozy']
        WHEN title ILIKE '%soup%' OR title ILIKE '%stew%' OR title ILIKE '%chowder%' OR title ILIKE '%curry%' OR title ILIKE '%pho%' OR title ILIKE '%ramen%' OR title ILIKE '%hot pot%' THEN ARRAY['warm_me_up', 'comforting', 'cozy']
        ELSE ARRAY[]::TEXT[]
      END) ||
      -- Cool me off: raw, cold, salads, ceviche, cold noodles, refreshing dishes
      (CASE
        WHEN cooking_method IN ('raw') THEN ARRAY['cool_me_off', 'light', 'refreshing', 'cleansing']
        WHEN base_group IN ('salad', 'seaweed') THEN ARRAY['cool_me_off', 'light', 'refreshing', 'cleansing']
        WHEN title ILIKE '%salad%' OR title ILIKE '%ceviche%' OR title ILIKE '%cold %' OR title ILIKE '%smoothie%' OR title ILIKE '%poke%' THEN ARRAY['cool_me_off', 'refreshing', 'light']
        ELSE ARRAY[]::TEXT[]
      END) ||
      -- Light: easy on the stomach, not too filling
      (CASE
        WHEN base_group IN ('quinoa', 'seed', 'plant') THEN ARRAY['light', 'cleansing', 'rejuvenating']
        WHEN base_group = 'salad' THEN ARRAY['light']
        ELSE ARRAY[]::TEXT[]
      END) ||
      -- Heavy & hearty: stick-to-your-ribs
      (CASE
        WHEN base_group IN ('pasta', 'dough', 'potato', 'pizza') THEN ARRAY['heavy', 'hearty']
        WHEN base_group IN ('legume') AND cooking_method IN ('stove', 'baked', 'bake') THEN ARRAY['heavy', 'hearty', 'earthy']
        ELSE ARRAY[]::TEXT[]
      END) ||
      -- Hearty: filling and comforting
      (CASE
        WHEN base_group IN ('rice', 'potato', 'pasta', 'bread', 'legume', 'soup', 'tortilla', 'corn', 'quinoa') THEN ARRAY['hearty', 'comforting']
        ELSE ARRAY[]::TEXT[]
      END) ||
      -- Earthy: grounding, natural, wholesome
      (CASE
        WHEN base_group IN ('legume', 'quinoa', 'potato', 'fermented', 'bread') THEN ARRAY['earthy']
        WHEN title ILIKE '%lentil%' OR title ILIKE '%bean%' OR title ILIKE '%dal %' OR title ILIKE '%mujadara%' THEN ARRAY['earthy', 'hearty']
        ELSE ARRAY[]::TEXT[]
      END) ||
      -- Cleansing: fresh, clean, feel-good
      (CASE
        WHEN base_group IN ('salad', 'plant', 'quinoa', 'seed') OR cooking_method = 'raw' THEN ARRAY['cleansing']
        ELSE ARRAY[]::TEXT[]
      END) ||
      -- Rejuvenating: revive and recharge
      (CASE
        WHEN base_group IN ('breakfast', 'seed') THEN ARRAY['rejuvenating', 'energy_booster']
        WHEN title ILIKE '%bowl%' AND base_group IN ('quinoa', 'rice') THEN ARRAY['rejuvenating']
        ELSE ARRAY[]::TEXT[]
      END) ||
      -- Energy booster: pick me up, fuel
      (CASE
        WHEN base_group IN ('breakfast', 'toast', 'oatmeal', 'pancakes') OR meal_type = 'breakfast' THEN ARRAY['energy_booster', 'simple']
        ELSE ARRAY[]::TEXT[]
      END) ||
      -- Comforting: cozy, familiar
      (CASE
        WHEN base_group IN ('soup', 'bread', 'pasta', 'rice', 'potato') AND cooking_method IN ('baked', 'bake', 'stove', 'boiled', 'boil', 'steamed', 'steam') THEN ARRAY['comforting', 'cozy']
        WHEN title ILIKE '%mac and cheese%' OR title ILIKE '%risotto%' OR title ILIKE '%casserole%' THEN ARRAY['comforting', 'cozy']
        ELSE ARRAY[]::TEXT[]
      END) ||
      -- Refreshing: crisp, bright (already partly in cool_me_off)
      (CASE
        WHEN base_group IN ('salad', 'seaweed') OR title ILIKE '%citrus%' OR title ILIKE '%lemon %' THEN ARRAY['refreshing']
        ELSE ARRAY[]::TEXT[]
      END) ||
      -- Cozy: warm and snug (overlap with warm_me_up / comforting)
      (CASE
        WHEN base_group = 'soup' OR title ILIKE '%stew%' OR title ILIKE '%casserole%' THEN ARRAY['cozy']
        ELSE ARRAY[]::TEXT[]
      END) ||
      -- Indulgent: treat yourself
      (CASE
        WHEN base_group IN ('dessert', 'pizza') THEN ARRAY['indulgent']
        WHEN title ILIKE '%cake%' OR title ILIKE '%chocolate%' OR title ILIKE '%tiramisu%' OR title ILIKE '%baklava%' OR title ILIKE '%churros%' OR title ILIKE '%fondue%' OR title ILIKE '%poutine%' THEN ARRAY['indulgent']
        ELSE ARRAY[]::TEXT[]
      END) ||
      -- Simple: no fuss
      (CASE
        WHEN base_group IN ('rice', 'bread', 'toast', 'pasta') THEN ARRAY['simple']
        WHEN title ILIKE '%simple%' OR title ILIKE '%easy %' OR title ILIKE '%basic %' THEN ARRAY['simple']
        ELSE ARRAY[]::TEXT[]
      END) ||
      -- Adventurous: try something new
      (CASE
        WHEN base_group IN ('noodles', 'sushi', 'fermented', 'seaweed', 'dough') THEN ARRAY['adventurous']
        WHEN title ILIKE '%sushi%' OR title ILIKE '%pho%' OR title ILIKE '%ramen%' OR title ILIKE '%kimchi%' OR title ILIKE '%dumpling%' OR title ILIKE '%okonomiyaki%' THEN ARRAY['adventurous']
        ELSE ARRAY[]::TEXT[]
      END)
    ) AS elem
  ) sub
);

-- Ensure every meal has at least one feeling
UPDATE public.gallery_meals
SET feeling_ids = ARRAY['simple']
WHERE feeling_ids IS NULL OR array_length(feeling_ids, 1) IS NULL;

COMMENT ON COLUMN public.gallery_meals.feeling_ids IS 'Feeling vibe ids from FEELINGS (e.g. warm_me_up, comforting). Used to filter gallery by "How are you feeling?". Remapped by 20250319000000_remap_gallery_meals_feeling_ids.';
