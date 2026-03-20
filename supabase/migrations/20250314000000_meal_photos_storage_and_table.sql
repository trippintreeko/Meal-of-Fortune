-- Meal photos: user-uploaded photos for saved meals (food gallery). Stored in Supabase when signed in; offline queue syncs via settings.

-- 1. Storage bucket for meal photos (public read so we can display in app)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'meal-photos',
  'meal-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS: users can only upload/update/delete in their own folder (auth.uid()/...)
DROP POLICY IF EXISTS "Users can upload own meal photos" ON storage.objects;
CREATE POLICY "Users can upload own meal photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'meal-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own meal photos" ON storage.objects;
CREATE POLICY "Users can update own meal photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'meal-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own meal photos" ON storage.objects;
CREATE POLICY "Users can delete own meal photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'meal-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Meal photo files are publicly readable" ON storage.objects;
CREATE POLICY "Meal photo files are publicly readable"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'meal-photos');

-- 2. Table: one row per (user, saved_meal_id) pointing to the stored image
CREATE TABLE IF NOT EXISTS public.meal_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  saved_meal_id TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, saved_meal_id)
);

CREATE INDEX IF NOT EXISTS idx_meal_photos_user_id ON public.meal_photos(user_id);

ALTER TABLE public.meal_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own meal photos" ON public.meal_photos;
CREATE POLICY "Users can view own meal photos"
  ON public.meal_photos FOR SELECT
  USING (user_id = public.get_my_profile_id());

DROP POLICY IF EXISTS "Users can insert own meal photos" ON public.meal_photos;
CREATE POLICY "Users can insert own meal photos"
  ON public.meal_photos FOR INSERT
  WITH CHECK (user_id = public.get_my_profile_id());

DROP POLICY IF EXISTS "Users can update own meal photos" ON public.meal_photos;
CREATE POLICY "Users can update own meal photos"
  ON public.meal_photos FOR UPDATE
  USING (user_id = public.get_my_profile_id());

DROP POLICY IF EXISTS "Users can delete own meal photos" ON public.meal_photos;
CREATE POLICY "Users can delete own meal photos"
  ON public.meal_photos FOR DELETE
  USING (user_id = public.get_my_profile_id());

COMMENT ON TABLE public.meal_photos IS 'User-uploaded photos for saved meals (Meals I want). One photo per saved_meal_id per user.';
