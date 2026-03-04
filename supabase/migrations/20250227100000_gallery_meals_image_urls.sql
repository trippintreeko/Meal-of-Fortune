-- Store up to 3 Unsplash image URLs per gallery meal for instant loading in app.
ALTER TABLE public.gallery_meals
  ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';

COMMENT ON COLUMN public.gallery_meals.image_urls IS 'Up to 3 image URLs (e.g. from Unsplash) for this meal; pre-fetched and stored for instant display in food gallery and meal detail.';
