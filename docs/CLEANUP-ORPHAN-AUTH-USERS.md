# Cleanup orphan auth users

This script deletes **auth users** (rows in `auth.users`) that no longer have a matching **profile** (row in `public.profiles` with `auth_id = auth.users.id`). That happens when a user deletes their account in the app: only the profile is removed; the auth user is left behind until you run this cleanup.

Run it **once a month** (or on demand) to keep auth tidy.

---

## Prerequisites

- **Node.js** (same as your project).
- **Service role key** from Supabase. Never use this in the app; only for scripts or backend.
  - Supabase Dashboard → **Project Settings** → **API** → copy **service_role** (under "Project API keys").

---

## 1. Set environment variables

Use either **A** or **B**.

### A. `.env` in the project root (recommended)

Create or edit `.env` in the project root (the same folder as `package.json`). Add:

```env
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

- **SUPABASE_URL:** Supabase Dashboard → Project Settings → API → **Project URL**.
- **SUPABASE_SERVICE_ROLE_KEY:** Project Settings → API → **service_role** key.

**Important:** Add `.env` to `.gitignore` if it is not already there, so the service role key is never committed.

Then load them when running the script (see step 2). The script does **not** load `.env` by itself; use one of the run options below that sets the variables.

### B. Export in the terminal (one-off run)

```bash
export SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key_here"
```

Use your real project URL and service_role key.

---

## 2. Run the script

From the **project root** (where `package.json` is):

**If you use a `.env` file** (e.g. with `dotenv` or a helper):

```bash
node -r dotenv/config scripts/cleanup-orphan-auth-users.mjs
```

If `dotenv` is not installed:

```bash
npm install -D dotenv
node -r dotenv/config scripts/cleanup-orphan-auth-users.mjs
```

**If you exported variables in the terminal** (or set them another way):

```bash
node scripts/cleanup-orphan-auth-users.mjs
```

**Optional npm script:** Add to `package.json` under `"scripts"`:

```json
"cleanup-orphan-auth": "node -r dotenv/config scripts/cleanup-orphan-auth-users.mjs"
```

Then run:

```bash
npm run cleanup-orphan-auth
```

---

## 3. What the script does

1. Fetches all `auth_id` values from `public.profiles`.
2. Lists all auth users (paginated).
3. Finds auth users whose `id` is **not** in the set of profile `auth_id`s (orphans).
4. Deletes each orphan with the Auth Admin API.
5. Prints how many were deleted and how many failed.

Example output:

```
Fetching profile auth_ids...
Found 42 profile(s) with auth_id.
Found 3 orphan auth user(s) (no matching profile).
Done. Deleted: 3, Failed: 0.
```

---

## 4. Running it monthly

- **Manual:** Run the command above once a month (or whenever you want).
- **Scheduled (e.g. cron):** On your own machine or server, add a cron job that runs the same command (with env vars set in the crontab or via a small wrapper script that sources `.env` and then runs `node scripts/cleanup-orphan-auth-users.mjs`).
- **CI / scheduled job:** Run the script from a CI pipeline or a cloud scheduler (e.g. GitHub Actions, cron job on a VPS), making sure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set as secrets.

---

## 5. Safety

- The script only deletes auth users that **do not** have a profile. It never touches auth users that still have a profile.
- It uses the **service role**, so keep the key secret and only run the script in a safe environment (your machine or a trusted server/CI).
