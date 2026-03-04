# delete-account

Edge Function that permanently deletes the calling user's **profile** and **auth user** (full account deletion).

- **Auth:** Requires `Authorization: Bearer <user JWT>` (the Supabase client sends this automatically when invoking from the app with an active session).
- **Steps:** Verifies the JWT → calls RPC `delete_user_profile_by_auth_id(user.id)` (FK cleanup + profile delete) → calls Auth Admin API to delete the user from `auth.users`.
- **Deploy (no global CLI):** From project root run `npm install` (installs Supabase CLI as dev dependency), then `npx supabase login` (once), then `npm run deploy:delete-account` or `npx supabase functions deploy delete-account`. If you have multiple projects, add `--project-ref YOUR_REF` (from your Supabase URL).
- **Required:** Run migration `20250219200000_delete_user_profile_by_auth_id_rpc.sql` in Supabase so the RPC exists. Otherwise the function returns 500 (e.g. "function ... does not exist").

After a successful call, the client should call `signOut()` and redirect (e.g. to profile tab).
