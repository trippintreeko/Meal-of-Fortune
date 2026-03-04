-- Gallery meals: predefined dishes for the food gallery (and later game meal generation).
-- Each row = one dish with title, description, and links to food_items for base/protein/vegetable.

CREATE TABLE IF NOT EXISTS public.gallery_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  base_id UUID REFERENCES public.food_items(id) ON DELETE SET NULL,
  protein_id UUID REFERENCES public.food_items(id) ON DELETE SET NULL,
  vegetable_id UUID REFERENCES public.food_items(id) ON DELETE SET NULL,
  cooking_method TEXT,
  meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'any')),
  base_group TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gallery_meals_base_group ON public.gallery_meals(base_group);
CREATE INDEX IF NOT EXISTS idx_gallery_meals_meal_type ON public.gallery_meals(meal_type);

COMMENT ON TABLE public.gallery_meals IS 'Predefined dishes for food gallery; game generation can point to these later.';

ALTER TABLE public.gallery_meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read gallery_meals" ON public.gallery_meals FOR SELECT USING (true);
