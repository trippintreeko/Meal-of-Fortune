# Supabase troubleshooting

This file helps you fix common Supabase issues in this app:

1. **Food items not loading** – Network/RLS/env when loading `food_items` (Feelings, Preferences).
2. **Meal Vote 500 / auth** – 500 on `/rest/v1/users`, multiple GoTrueClient, clipboard error, and the **fix** (use `profiles` table).

---

## Food items not loading

When the app shows "Network request failed" or food lists are empty, use the logs and steps below.

## 1. Check app logs (Metro terminal / device)

With `npx expo start` running, open the **Feelings** screen (What are you feeling?) or **Preferences**. In the terminal you should see:

- **`[Supabase] URL:`** – Should show the start of your project URL (e.g. `https://xxxxx.supabase.co...`). If it says `(missing)`, the app has no URL.
- **`[Supabase] URL source:`** – `expo.extra` (from app.config.js) or `process.env` or `none`. Prefer `expo.extra`.
- **`[Supabase] Anon key length:`** – Should be a positive number (e.g. 200+). If `0`, the key is missing.
- **`[Feeling] Fetching food_items...`** / **`[Preferences] Fetching food_items...`** – Request started.
- Then either:
  - **`[Feeling] food_items loaded: N rows`** – Success.
  - **`[Feeling] food_items error: ...`** – Supabase returned an error (see error code).
  - **`[Feeling] food_items exception: TypeError: Network request failed`** – Request never reached Supabase (wrong URL, no network, or SSL).

Interpretation:

| Logs                                                        | Likely cause                                                             |
| ----------------------------------------------------------- | ------------------------------------------------------------------------ |
| URL `(missing)`, key length `0`                             | Env vars not in app. Fix app.config.js and run `npx expo start --clear`. |
| URL and key look correct, then "Network request failed"     | Device/emulator can’t reach Supabase (network, DNS, firewall).           |
| URL and key correct, then `food_items error: ...` with code | Supabase-side (e.g. RLS, missing table). Check Dashboard.                |

## 2. Supabase Dashboard checks

1. **Project URL and anon key**

   - Dashboard → **Project Settings** (gear) → **API**.
   - Copy **Project URL** and **anon public** key.
   - Ensure `.env` has exactly:
     - `EXPO_PUBLIC_SUPABASE_URL=<Project URL>`
     - `EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon public key>`
   - No quotes, no spaces around `=`.

2. **Table `food_items`**

   - **Table Editor** → open **food_items**.
   - Confirm there are rows (run seed if needed: **SQL Editor** → paste `supabase/seed-food-items.sql` → Run).

3. **Row Level Security (RLS)**

   - **Table Editor** → **food_items** → click the lock icon or open **Policies**.
   - If RLS is **enabled**, you must have a policy that allows **SELECT** for the `anon` role.
   - To allow public read for development:
     - **Authentication** → **Policies** → **food_items** → **New policy** → "Enable read access for all users" (or custom):
     - Policy name: e.g. `Allow public read`
     - Allowed operation: **SELECT**
     - Target roles: **anon**
     - USING expression: `true`
   - If RLS is **disabled**, anyone with the anon key can read (OK for dev).

4. **Test the API from the dashboard**
   - **API** → **REST** or **Table Editor** → **food_items** → try a simple select.
   - If that works, the problem is in the app (URL/key/network). If it fails, fix table/RLS first.

## 3. Test from the device/emulator

- On the **same** Android emulator or device where the app runs, open the **browser** and go to:
  `https://<your-project-ref>.supabase.co/rest/v1/`
- You should get a response (e.g. 401 or a list of tables), not a connection error.
- If the browser can’t open that URL, the device can’t reach Supabase (network/DNS/firewall).

## 4. App-side checklist

- [ ] `app.config.js` exists in the project root and loads `.env` (see repo root).
- [ ] `npm install` run (so `dotenv` is installed if used in app.config.js).
- [ ] After any change to `.env` or `app.config.js`: `npx expo start --clear`, then reload the app.
- [ ] No typos in `.env`: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

After changes, watch the same `[Supabase]` and `[Feeling]` / `[Preferences]` logs again to confirm URL, key, and request result.

---

## Meal Vote: 500 on `users` table and auth

If you see **500** on `/rest/v1/users?select=*&auth_id=eq.<uuid>`, **"Multiple GoTrueClient instances"**, or **"Unable to resolve module @react-native-clipboard/clipboard"**:

### Fix 500 and clipboard (do this)

1. **Run the profiles rename once (if you still have a `users` table)**

   - Supabase Dashboard → **SQL Editor** → **New query**.
   - Paste **`supabase/migrations/20250130100000_rename_users_to_profiles.sql`** → **Run**.
   - If you see **"relation \"users\" does not exist"**, the table was already renamed; skip to step 2.

2. **Run the RLS fix migration (fixes 500 on `/profiles`)**  
   After renaming, 500 on `/profiles` is often RLS recursion. Run:

   - SQL Editor → **New query**.
   - Paste **`supabase/migrations/20250130200000_fix_profiles_rls_no_recursion.sql`** → **Run**.
   - You should see "Success. No rows returned."

3. **If you get "infinite recursion detected in policy for relation group_members" when creating a group**  
   Run **`supabase/migrations/20250130300000_fix_group_members_rls_recursion.sql`** in the SQL Editor.

4. **App already uses `profiles`** — no code change. Reload the app and sign in again.

5. **Clear bundle if you still see clipboard errors**
   - `npx expo start --clear`, then reload the app.

### Groups in Supabase but not in the app

The app lists groups where you’re a **member** (group_members) or the **creator** (meal_groups.created_by). If you see groups in Table Editor → **meal_groups** with you as creator but still see "No groups yet" in the app:

1. Run **`supabase/migrations/20250130900000_creators_can_view_own_groups.sql`** in the SQL Editor so creators can SELECT their groups. The app also loads groups by **created_by**, so your created groups will show after this.
2. (Optional) Run **`supabase/migrations/20250130800000_backfill_group_members_creators.sql`** to add you as a member in **group_members** for each group you created (so membership-based features stay consistent).

Then reload the app. If you **joined** a group on another device (e.g. second phone) and don’t see it, pull down to refresh on the Meal groups screen; the list refetches and should show the joined group.

### Group members show as "Unknown" / second phone doesn’t see group

- **"Unknown" for other members:** Profiles were only visible to friends. Run **`supabase/migrations/20250131000000_profiles_visible_to_same_group.sql`** so users in the same meal group can see each other’s profiles (e.g. username). After that, group members show correct usernames even if they’re not friends.
- **Second phone doesn’t see joined group:** After joining with a group code, pull down to refresh on the Meal groups screen. If it still doesn’t appear, confirm in Supabase (Table Editor → **group_members**) that there is a row for that user and group.

### Single Supabase client

The app uses a **singleton** client in `lib/supabase.ts`. If you still see "Multiple GoTrueClient instances", do `npx expo start --clear` and reload.

### 400 on `/auth/v1/token?grant_type=password`

Usually **invalid email or password**, or **email not confirmed** if you have confirmations on. Check credentials and Dashboard → **Authentication** → **Users**.

### Security lint: RLS disabled on food_items / Security Definer on voting_history

If Supabase reports **RLS Disabled in Public** for `public.food_items` or **Security Definer View** for `public.voting_history`, run **`supabase/migrations/20250130600000_fix_food_items_rls_and_voting_history_view.sql`** in the SQL Editor. It enables RLS on `food_items` with a public-read-only policy and recreates `voting_history` with `security_invoker = on` so RLS on underlying tables applies to view queries.

### Security lint: Function search path mutable / RLS policy always true (notifications)

If Supabase reports **Function Search Path Mutable** for `public.set_updated_at` or **RLS Policy Always True** for `public.notifications` (INSERT), run **`supabase/migrations/20250130700000_fix_security_lint_set_updated_at_and_notifications.sql`** in the SQL Editor. It sets a fixed `search_path` on `set_updated_at` and restricts notifications INSERT so clients can only insert rows for their own `user_id` (Edge Functions using the service role key bypass RLS and are unaffected).

### Security: Leaked password protection (Auth)

If Supabase reports **Leaked Password Protection Disabled**, enable it in the Dashboard: **Authentication** → **Settings** (or **Security**) → turn on **Leaked password protection** / **Block leaked passwords** (HaveIBeenPwned). No code changes required. This blocks signup and password reset when the password is known to be compromised.
