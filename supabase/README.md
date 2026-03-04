# Supabase setup for this project

## Link your Supabase project (env vars)

1. **Get your keys**  
   Supabase Dashboard → your project → **Project Settings** (gear) → **API**  
   Copy:
   - **Project URL** (e.g. `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")

2. **Create `.env` in the project root** (same folder as `package.json`):
   ```bash
   cp .env.example .env
   ```
   Or create `.env` manually with:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```
   Paste your real URL and anon key.

3. **Restart the dev server**  
   Stop Expo (Ctrl+C), then run `npx expo start` again so it picks up the new env.

4. **Optional: Supabase CLI**  
   For migrations and local Supabase:
   ```bash
   npx supabase link --project-ref your-project-ref
   ```
   Project ref is in the dashboard URL: `https://supabase.com/dashboard/project/<project-ref>`.
