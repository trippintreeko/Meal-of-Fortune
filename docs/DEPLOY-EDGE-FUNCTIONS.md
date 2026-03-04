# Deploy Edge Functions (no global Supabase CLI)

Supabase no longer supports `npm install -g supabase`. Use the CLI from the project instead.

---

## 1. Install and log in (once)

From the **project root** (where `package.json` is):

```powershell
npm install
npx supabase login
```

`supabase login` opens a browser to link the CLI to your Supabase account.

---

## 2. Deploy the delete-account function

Still in the project root:

```powershell
npm run deploy:delete-account
```

or:

```powershell
npx supabase functions deploy delete-account --no-verify-jwt
```

**Why `--no-verify-jwt`?** The Supabase gateway can return 401 before your function runs when it validates the JWT with the “legacy” secret. Session tokens are often signed with the newer JWT signing keys (ES256). Using `--no-verify-jwt` lets the request through; the function then validates the user with `getUser(token)`.

**Alternative (Dashboard):** Edge Functions → delete-account → **Details** → turn **OFF** “Verify JWT with legacy secret”, then deploy normally (no flag). Same effect.

If you have **multiple Supabase projects**, tell the CLI which one:

```powershell
npx supabase functions deploy delete-account --no-verify-jwt --project-ref YOUR_PROJECT_REF
```

**YOUR_PROJECT_REF** is the part of your Supabase URL: `https://YOUR_PROJECT_REF.supabase.co` (Dashboard → Project Settings → API).

---

## 3. Optional: install CLI globally (Windows)

If you prefer a global `supabase` command:

- **Scoop:** `scoop bucket add supabase https://github.com/supabase/scoop-bucket` then `scoop install supabase`
- **Chocolatey:** `choco install supabase`

Then you can run `supabase functions deploy delete-account` from the project root without `npx`.
