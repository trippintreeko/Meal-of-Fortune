-- Spoonacular recipe matching and ingredient images for minigames.
-- Run script spoonacular-match-and-save.mjs to populate (requires SPOONACULAR_API_KEY).

-- 1. Link gallery_meals to Spoonacular recipe (one match per meal)
ALTER TABLE public.gallery_meals
  ADD COLUMN IF NOT EXISTS spoonacular_recipe_id INTEGER;

COMMENT ON COLUMN public.gallery_meals.spoonacular_recipe_id IS 'Spoonacular recipe id from search match; used for recipe info and ingredient images.';

-- 2. Ingredient images: one row per Spoonacular ingredient id, image stored in Supabase Storage.
CREATE TABLE IF NOT EXISTS public.ingredient_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spoonacular_ingredient_id INTEGER NOT NULL UNIQUE,
  name TEXT,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ingredient_assets IS 'Ingredient images from Spoonacular, copied to our Storage for minigames; keyed by Spoonacular ingredient id.';

-- RLS: public read (minigames need to show images)
ALTER TABLE public.ingredient_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read ingredient_assets" ON public.ingredient_assets;
CREATE POLICY "Allow public read ingredient_assets"
  ON public.ingredient_assets FOR SELECT
  TO public
  USING (true);

-- Service/backend can insert and update (script uses service role for upsert)
DROP POLICY IF EXISTS "Allow insert ingredient_assets" ON public.ingredient_assets;
CREATE POLICY "Allow insert ingredient_assets"
  ON public.ingredient_assets FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update ingredient_assets" ON public.ingredient_assets;
CREATE POLICY "Allow update ingredient_assets"
  ON public.ingredient_assets FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. Storage bucket for ingredient images (public read for app/minigames)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ingredient-images',
  'ingredient-images',
  true,
  524288,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public read for ingredient images
DROP POLICY IF EXISTS "Ingredient images are publicly readable" ON storage.objects;
CREATE POLICY "Ingredient images are publicly readable"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'ingredient-images');

-- Script (service role) can upload ingredient images
DROP POLICY IF EXISTS "Service role can upload ingredient images" ON storage.objects;
CREATE POLICY "Service role can upload ingredient images"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'ingredient-images');
