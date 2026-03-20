-- Store up to 3 image URLs per gallery meal for instant loading in app (e.g. from Spoonacular or pre-fetched).
ALTER TABLE public.gallery_meals
  ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';

COMMENT ON COLUMN public.gallery_meals.image_urls IS 'Up to 3 image URLs for this meal; pre-fetched and stored for instant display in food gallery and meal detail.';
