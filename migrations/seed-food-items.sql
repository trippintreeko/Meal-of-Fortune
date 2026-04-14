-- =============================================================================
-- Food Decider App: food_items seed data for Supabase
-- =============================================================================
-- How to use: In Supabase Dashboard → SQL Editor → New query → paste this file
--             → Run. Creates the table (if missing) and inserts seed rows.
-- =============================================================================

-- Create table if it doesn't exist (matches types/database.ts FoodItem)
CREATE TABLE IF NOT EXISTS public.food_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('base', 'protein', 'vegetable', 'seasoning', 'garnish')),
  cooking_method TEXT,
  meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'any')),
  texture TEXT CHECK (texture IN ('bite_sized', 'soup', 'full_course', 'handheld')),
  mood TEXT[],
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Optional: allow anonymous read for development (tighten for production)
-- ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow public read" ON public.food_items FOR SELECT USING (true);

-- Clear existing seed data (optional; comment out if you want to keep existing rows)
-- TRUNCATE public.food_items RESTART IDENTITY CASCADE;

-- =============================================================================
-- SEED DATA (IDs below are fixed so app/game/mood.tsx "Try sample results" works)
-- =============================================================================

-- Bases (first ID used by mood stub: 11111111-1111-1111-1111-111111111101)
INSERT INTO public.food_items (id, name, category, meal_type) VALUES
  ('11111111-1111-1111-1111-111111111101', 'rice', 'base', 'any'),
  ('11111111-1111-1111-1111-111111111102', 'quinoa', 'base', 'any'),
  ('11111111-1111-1111-1111-111111111103', 'beans', 'base', 'any'),
  ('11111111-1111-1111-1111-111111111104', 'bread', 'base', 'any'),
  ('11111111-1111-1111-1111-111111111105', 'tortilla', 'base', 'any'),
  ('11111111-1111-1111-1111-111111111106', 'oatmeal', 'base', 'breakfast'),
  ('11111111-1111-1111-1111-111111111107', 'toast', 'base', 'breakfast'),
  ('11111111-1111-1111-1111-111111111108', 'yogurt', 'base', 'breakfast'),
  ('11111111-1111-1111-1111-111111111109', 'cereal', 'base', 'breakfast'),
  ('11111111-1111-1111-1111-11111111110a', 'pancakes', 'base', 'breakfast'),
  ('11111111-1111-1111-1111-11111111110b', 'pasta', 'base', 'any'),
  ('11111111-1111-1111-1111-11111111110c', 'noodles', 'base', 'any'),
  ('11111111-1111-1111-1111-11111111110d', 'couscous', 'base', 'any'),
  ('11111111-1111-1111-1111-11111111110e', 'polenta', 'base', 'any'),
  ('11111111-1111-1111-1111-11111111110f', 'wraps', 'base', 'any'),
  ('11111111-1111-1111-1111-111111111110', 'bagel', 'base', 'breakfast'),
  ('11111111-1111-1111-1111-111111111111', 'hash browns', 'base', 'breakfast'),
  ('11111111-1111-1111-1111-111111111112', 'grits', 'base', 'breakfast'),
  ('11111111-1111-1111-1111-111111111113', 'ramen', 'base', 'any'),
  ('11111111-1111-1111-1111-111111111114', 'risotto', 'base', 'any')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category, meal_type = EXCLUDED.meal_type;

-- Proteins (first ID: 22222222-2222-2222-2222-222222222201)
INSERT INTO public.food_items (id, name, category, meal_type) VALUES
  ('22222222-2222-2222-2222-222222222201', 'chicken', 'protein', 'any'),
  ('22222222-2222-2222-2222-222222222202', 'tofu', 'protein', 'any'),
  ('22222222-2222-2222-2222-222222222203', 'fish', 'protein', 'any'),
  ('22222222-2222-2222-2222-222222222204', 'eggs', 'protein', 'breakfast'),
  ('22222222-2222-2222-2222-222222222205', 'bacon', 'protein', 'breakfast'),
  ('22222222-2222-2222-2222-222222222206', 'salmon', 'protein', 'any'),
  ('22222222-2222-2222-2222-222222222207', 'beef', 'protein', 'any'),
  ('22222222-2222-2222-2222-222222222208', 'turkey', 'protein', 'any'),
  ('22222222-2222-2222-2222-222222222209', 'shrimp', 'protein', 'any'),
  ('22222222-2222-2222-2222-22222222220a', 'beans', 'protein', 'any'),
  ('22222222-2222-2222-2222-22222222220b', 'tempeh', 'protein', 'any'),
  ('22222222-2222-2222-2222-22222222220c', 'pork', 'protein', 'any'),
  ('22222222-2222-2222-2222-22222222220d', 'lamb', 'protein', 'any'),
  ('22222222-2222-2222-2222-22222222220e', 'tuna', 'protein', 'any'),
  ('22222222-2222-2222-2222-22222222220f', 'sausage', 'protein', 'any'),
  ('22222222-2222-2222-2222-222222222210', 'ham', 'protein', 'any'),
  ('22222222-2222-2222-2222-222222222211', 'lentils', 'protein', 'any'),
  ('22222222-2222-2222-2222-222222222212', 'chickpeas', 'protein', 'any'),
  ('22222222-2222-2222-2222-222222222213', 'crab', 'protein', 'any'),
  ('22222222-2222-2222-2222-222222222214', 'scallops', 'protein', 'any')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category, meal_type = EXCLUDED.meal_type;

-- Vegetables (first ID: 33333333-3333-3333-3333-333333333301)
INSERT INTO public.food_items (id, name, category, meal_type) VALUES
  ('33333333-3333-3333-3333-333333333301', 'salad greens', 'vegetable', 'any'),
  ('33333333-3333-3333-3333-333333333302', 'broccoli', 'vegetable', 'any'),
  ('33333333-3333-3333-3333-333333333303', 'spinach', 'vegetable', 'any'),
  ('33333333-3333-3333-3333-333333333304', 'avocado', 'vegetable', 'any'),
  ('33333333-3333-3333-3333-333333333305', 'tomatoes', 'vegetable', 'any'),
  ('33333333-3333-3333-3333-333333333306', 'bell peppers', 'vegetable', 'any'),
  ('33333333-3333-3333-3333-333333333307', 'carrots', 'vegetable', 'any'),
  ('33333333-3333-3333-3333-333333333308', 'zucchini', 'vegetable', 'any'),
  ('33333333-3333-3333-3333-333333333309', 'berries', 'vegetable', 'breakfast'),
  ('33333333-3333-3333-3333-33333333330a', 'mushrooms', 'vegetable', 'any'),
  ('33333333-3333-3333-3333-33333333330b', 'kale', 'vegetable', 'any'),
  ('33333333-3333-3333-3333-33333333330c', 'onions', 'vegetable', 'any'),
  ('33333333-3333-3333-3333-33333333330d', 'cucumber', 'vegetable', 'any'),
  ('33333333-3333-3333-3333-33333333330e', 'corn', 'vegetable', 'any'),
  ('33333333-3333-3333-3333-33333333330f', 'peas', 'vegetable', 'any'),
  ('33333333-3333-3333-3333-333333333310', 'sweet potato', 'vegetable', 'any'),
  ('33333333-3333-3333-3333-333333333311', 'eggplant', 'vegetable', 'any'),
  ('33333333-3333-3333-3333-333333333312', 'cabbage', 'vegetable', 'any'),
  ('33333333-3333-3333-3333-333333333313', 'lettuce', 'vegetable', 'any'),
  ('33333333-3333-3333-3333-333333333314', 'asparagus', 'vegetable', 'any'),
  ('33333333-3333-3333-3333-333333333315', 'green beans', 'vegetable', 'any'),
  ('33333333-3333-3333-3333-333333333316', 'brussels sprouts', 'vegetable', 'any')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category, meal_type = EXCLUDED.meal_type;

-- Seasonings (shared across meals)
INSERT INTO public.food_items (id, name, category, meal_type) VALUES
  ('44444444-4444-4444-4444-444444444401', 'garlic', 'seasoning', 'any'),
  ('44444444-4444-4444-4444-444444444402', 'salt', 'seasoning', 'any'),
  ('44444444-4444-4444-4444-444444444403', 'pepper', 'seasoning', 'any'),
  ('44444444-4444-4444-4444-444444444404', 'chili', 'seasoning', 'any'),
  ('44444444-4444-4444-4444-444444444405', 'herbs', 'seasoning', 'any'),
  ('44444444-4444-4444-4444-444444444406', 'paprika', 'seasoning', 'any'),
  ('44444444-4444-4444-4444-444444444407', 'cumin', 'seasoning', 'any'),
  ('44444444-4444-4444-4444-444444444408', 'oregano', 'seasoning', 'any'),
  ('44444444-4444-4444-4444-444444444409', 'basil', 'seasoning', 'any'),
  ('44444444-4444-4444-4444-44444444440a', 'ginger', 'seasoning', 'any')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category, meal_type = EXCLUDED.meal_type;

-- Garnishes
INSERT INTO public.food_items (id, name, category, meal_type) VALUES
  ('55555555-5555-5555-5555-555555555501', 'cheese', 'garnish', 'any'),
  ('55555555-5555-5555-5555-555555555502', 'sauce', 'garnish', 'any'),
  ('55555555-5555-5555-5555-555555555503', 'lime', 'garnish', 'any'),
  ('55555555-5555-5555-5555-555555555504', 'cilantro', 'garnish', 'any'),
  ('55555555-5555-5555-5555-555555555505', 'green onions', 'garnish', 'any'),
  ('55555555-5555-5555-5555-555555555506', 'nuts', 'garnish', 'any'),
  ('55555555-5555-5555-5555-555555555507', 'sesame seeds', 'garnish', 'any'),
  ('55555555-5555-5555-5555-555555555508', 'parsley', 'garnish', 'any'),
  ('55555555-5555-5555-5555-555555555509', 'sour cream', 'garnish', 'any'),
  ('55555555-5555-5555-5555-55555555550a', 'hot sauce', 'garnish', 'any'),
  ('55555555-5555-5555-5555-55555555550b', 'olives', 'garnish', 'any'),
  ('55555555-5555-5555-5555-55555555550c', 'pickles', 'garnish', 'any'),
  ('55555555-5555-5555-5555-55555555550d', 'hummus', 'garnish', 'any'),
  ('55555555-5555-5555-5555-55555555550e', 'guacamole', 'garnish', 'any'),
  ('55555555-5555-5555-5555-55555555550f', 'salsa', 'garnish', 'any'),
  ('55555555-5555-5555-5555-555555555510', 'balsamic', 'garnish', 'any'),
  ('55555555-5555-5555-5555-555555555511', 'dill', 'garnish', 'any'),
  ('55555555-5555-5555-5555-555555555512', 'mint', 'garnish', 'any')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category, meal_type = EXCLUDED.meal_type;

-- =============================================================================
-- Note: Cooking methods (grilled, baked, fried, etc.) are passed in the app
-- as a string param, not stored in food_items. No seed rows for those.
-- =============================================================================
