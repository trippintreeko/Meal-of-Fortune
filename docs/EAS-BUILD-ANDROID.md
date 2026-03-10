# EAS Build – Android crash fix and iOS bundleIdentifier

## Why the app can crash on Android after install

EAS Build runs in the cloud and **does not upload your local `.env` file**. So `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are empty at build time. They get baked into the app via `app.config.js` → `expo.extra`. If they’re empty, the app has no Supabase URL/key and can crash when it tries to use Supabase.

## Fix: set environment variables in EAS

Production builds use the **production** environment (see `eas.json` → `build.production.environment`). Add your Supabase values there.

### Option A: EAS CLI

From the project root, run (replace the placeholder values with your real Supabase URL and anon key):

```bash
eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://YOUR_PROJECT_REF.supabase.co" --environment production --visibility plaintext
eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "YOUR_ANON_KEY" --environment production --visibility plaintext
```

Use **plaintext** (or **sensitive**) so they are available at build time. **Do not use "secret"** for `EXPO_PUBLIC_*` variables—they are compiled into the app and visible in plain text; secret visibility is for server-only values (e.g. NPM_TOKEN). See [EAS environment variables](https://docs.expo.dev/eas/environment-variables/). Confirm they appear under **production** at [expo.dev](https://expo.dev) → your project → **Environment variables**.

### Option B: Expo dashboard

1. Open **[expo.dev](https://expo.dev)** → your account → project **bolt-expo-nativewind**.
2. Go to **Environment variables** (or Project settings → Environment variables).
3. Select the **production** environment and add:
   - **Name:** `EXPO_PUBLIC_SUPABASE_URL`  
     **Value:** your Supabase project URL (e.g. `https://xxxx.supabase.co`)
   - **Name:** `EXPO_PUBLIC_SUPABASE_ANON_KEY`  
     **Value:** your Supabase anon (public) key
4. Save.

Then run a **new** production build:

```bash
npx eas build --platform android --profile production
```

The new build will have the URL and key baked in, and the app should no longer crash on open.

## iOS bundleIdentifier

`ios.bundleIdentifier` is set in `app.config.js` to `com.trippintreeko.mealoffortune` so that `eas build --platform all` can build both Android and iOS. If you only need Android for now, you can run:

```bash
npx eas build --platform android --profile production
```

and ignore iOS.
