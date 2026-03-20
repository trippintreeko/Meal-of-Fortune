-- Full recipe data (instructions, portions, ingredients with amounts) and recipe photos.
-- Enables in-app recipe view and grocery list for "meals I want".
-- Populated by scripts/spoonacular-match-and-save.mjs.

-- 1. Recipe details: one row per Spoonacular recipe we use (instructions, servings, photo).
CREATE TABLE IF NOT EXISTS public.spoonacular_recipe_details (
  spoonacular_recipe_id INTEGER PRIMARY KEY,
  title TEXT,
  instructions TEXT,
  servings INTEGER,
  ready_in_minutes INTEGER,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.spoonacular_recipe_details IS 'Cached Spoonacular recipe: instructions, portions, photo URL (our Storage or Spoonacular).';

-- 2. Recipe ingredients: amounts and units for grocery list and display.
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spoonacular_recipe_id INTEGER NOT NULL REFERENCES public.spoonacular_recipe_details(spoonacular_recipe_id) ON DELETE CASCADE,
  spoonacular_ingredient_id INTEGER,
  name TEXT NOT NULL,
  amount NUMERIC(10, 2),
  unit TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON public.recipe_ingredients(spoonacular_recipe_id);

COMMENT ON TABLE public.recipe_ingredients IS 'Per-recipe ingredients with amount/unit for instructions and grocery list.';

-- RLS: public read for app and grocery list
ALTER TABLE public.spoonacular_recipe_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read spoonacular_recipe_details" ON public.spoonacular_recipe_details;
CREATE POLICY "Allow public read spoonacular_recipe_details"
  ON public.spoonacular_recipe_details FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow public read recipe_ingredients" ON public.recipe_ingredients;
CREATE POLICY "Allow public read recipe_ingredients"
  ON public.recipe_ingredients FOR SELECT TO public USING (true);

-- Service role can insert/update (script)
DROP POLICY IF EXISTS "Allow insert update spoonacular_recipe_details" ON public.spoonacular_recipe_details;
CREATE POLICY "Allow insert update spoonacular_recipe_details"
  ON public.spoonacular_recipe_details FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow insert update recipe_ingredients" ON public.recipe_ingredients;
CREATE POLICY "Allow insert update recipe_ingredients"
  ON public.recipe_ingredients FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. Storage bucket for recipe photos (meal/recipe images we own)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'recipe-images',
  'recipe-images',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Recipe images are publicly readable" ON storage.objects;
CREATE POLICY "Recipe images are publicly readable"
  ON storage.objects FOR SELECT TO public USING (bucket_id = 'recipe-images');

DROP POLICY IF EXISTS "Service role can upload recipe images" ON storage.objects;
CREATE POLICY "Service role can upload recipe images"
  ON storage.objects FOR INSERT TO service_role WITH CHECK (bucket_id = 'recipe-images');
