# Profile picture: food avatars and gallery upload

## Food avatar (no network required)

In **Settings → Choose food avatar** you can pick one of the app’s food images as your profile picture. This is stored as `avatar_url = "food:key"` (e.g. `food:rice`, `food:chicken`) and does not use the storage bucket. It works offline and avoids upload issues.

## Gallery upload (“Upload failed: network request error”)

This app uses **Supabase Storage** for profile photos (not better-auth). The “upload failed: network request error” message usually means one of:

1. **React Native and local URIs** – `fetch(uri)` for a device `file://` or `content://` URI can fail or not support `.blob()` on some runtimes. Fixing this would require using a different upload path (e.g. reading the file with `expo-file-system` and uploading base64 or a different payload).
2. **Supabase Storage** – The `avatars` bucket must exist, and RLS must allow the authenticated user to upload to their own path (`auth_id/filename`). See migration `20250218000000_profile_settings_columns.sql` for the storage policies.
3. **Network** – The device must be able to reach your Supabase project URL (not localhost when testing on a physical device).

Until gallery upload is fixed for your environment, use **Choose food avatar** in Settings for a profile picture that works without upload.
