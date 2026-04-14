-- Profile settings and preferences columns for Meal Vote app.
-- Run after profiles table exists. All new columns are optional (defaults provided).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#22c55e',
  ADD COLUMN IF NOT EXISTS font_size TEXT DEFAULT 'medium' CHECK (font_size IN ('small', 'medium', 'large')),
  ADD COLUMN IF NOT EXISTS reduce_motion BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS disliked_foods TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS price_preference INTEGER DEFAULT 2 CHECK (price_preference >= 1 AND price_preference <= 4),
  ADD COLUMN IF NOT EXISTS spice_tolerance INTEGER DEFAULT 3 CHECK (spice_tolerance >= 1 AND spice_tolerance <= 5),
  ADD COLUMN IF NOT EXISTS portion_preference TEXT DEFAULT 'medium' CHECK (portion_preference IN ('small', 'medium', 'large')),
  ADD COLUMN IF NOT EXISTS dont_want_today TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS dont_want_expires TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS connected_accounts JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.bio IS 'Optional user bio / about me';
COMMENT ON COLUMN public.profiles.theme IS 'light | dark | system';
COMMENT ON COLUMN public.profiles.notification_settings IS 'JSON: meal_reminders, friend_requests, group_invites, etc.';
COMMENT ON COLUMN public.profiles.privacy_settings IS 'JSON: profile_visibility, show_friend_code_in_search, etc.';
COMMENT ON COLUMN public.profiles.dont_want_expires IS 'Midnight (or next day) when dont_want_today should be cleared';

-- Avatars storage bucket (public read for profile pics)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS: allow authenticated users to upload/update their own avatar (path: auth_id/filename)
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Avatar files are publicly readable"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');
