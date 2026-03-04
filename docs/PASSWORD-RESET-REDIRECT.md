# Password reset redirect

You can handle the reset-password link from the email in two ways:

1. **App only (deep link)** – Link opens the app on the same device; user sets a new password in the app.
2. **Web page** – Link opens a browser to a hosted page where the user sets a new password, then opens the app to sign in.

Use one or both. If you use the web page, add its URL to Supabase and (optionally) point the app’s “Forgot password” flow to it so the email link works in any browser.

---

## Option 1: App deep link (no website)

The app uses **deep linking** so the reset link can open the app.

| Source        | Value                              |
| ------------- | ---------------------------------- |
| Scheme        | `myapp` (from `app.json`)          |
| Callback path | `social/auth-callback`             |
| **Full URL**  | **`myapp://social/auth-callback`** |

**Supabase:** Authentication → URL Configuration → Redirect URLs → add **`myapp://social/auth-callback`** (or `myapp://**`).

Flow: User taps link in email → Supabase redirects to `myapp://social/auth-callback#...` → app opens → Set new password screen → user signs in.

---

## Option 2: Web page (works in any browser)

A standalone web page lets users reset their password in the browser, then open the app to sign in.

### Files

- **`web/reset-password.html`** – Single HTML page: reads the token from the URL (after Supabase redirects), sets the session, shows “Set new password” form, calls Supabase to update the password, then shows “Open app”.
- **`web/config.example.js`** – Example config. Copy to **`web/config.js`** and set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and optionally `APP_DEEP_LINK` (`myapp://social/groups`). Do not commit `config.js` if it contains real keys.

### Hosting

1. Host the contents of **`web/`** on your domain (e.g. **`https://setup.mealoffortune.io/reset-password`** or **`https://mealoffortune.io/reset-password.html`**).
2. If you don’t use `config.js`, edit the variables at the top of the `<script>` in `reset-password.html`: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and optionally `APP_DEEP_LINK`.

### Supabase redirect URL

1. Supabase Dashboard → **Authentication** → **URL Configuration** → **Redirect URLs**.
2. Add the **full URL** of the reset page, e.g. **`https://setup.mealoffortune.io/reset-password`** (no trailing slash, or match how your server serves it).

### Flow

1. User requests “Forgot password” in the app and enters email.
2. Supabase sends an email with a link to its verify endpoint.
3. User opens the link (e.g. on desktop or in any browser).
4. Supabase verifies the token and redirects to your web page with `#access_token=...&refresh_token=...&type=recovery`.
5. The page uses the tokens to set the session, shows “Set new password”, and on submit calls `supabase.auth.updateUser({ password })`.
6. User sees “Password updated” and can tap “Open Meal of Fortune app” to go to `myapp://social/groups` and sign in.

### Using the web URL from the app

To have the **email link always open the web page** (so it works on any device), set the redirect URL used when requesting the reset to your web page URL instead of the app deep link.

In **`app/social/forgot-password.tsx`**, change the `redirectTo` passed to `resetPasswordForEmail` from:

- `Linking.createURL('social/auth-callback')` (app deep link)

to your hosted reset page, e.g.:

- `'https://setup.mealoffortune.io/reset-password'`

Then the link in the email will open the browser to your page. Users on a phone can set their password there and then tap “Open app”. You can still keep **`myapp://social/auth-callback`** in Supabase Redirect URLs if you want to support both (e.g. you switch `redirectTo` by platform or keep the deep link for in-app testing).

---

## Development: localhost redirect

In development (`__DEV__`), both **password reset** and **email confirmation (signup)** use **`http://localhost:8081/social/auth-callback`** as the redirect URL so you can open the link in the browser.

Add this to Supabase Redirect URLs while developing:

- **`http://localhost:8081/social/auth-callback`**

- **Password reset:** Request a reset email, click the link → browser opens that URL with tokens → app shows the set-new-password screen.
- **Email confirmation:** After signup, click the verification link in the email → browser opens that URL → app sets the session and redirects to the social/groups page.

---

## One-time Supabase setup (both options)

1. Supabase Dashboard → **Authentication** → **URL Configuration**.
2. Under **Redirect URLs**, add:
   - **`myapp://social/auth-callback`** (for app deep link),
   - **`http://localhost:8081/social/auth-callback`** (for local dev in browser),
   - **`https://your-domain.com/reset-password`** (for the web page, when used).
3. Save.
