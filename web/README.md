# Reset password web page

This folder contains a standalone web page that handles the **password reset** flow when the user clicks the link in the reset email. Supabase redirects to this page with tokens in the URL; the page sets the session, shows a “Set new password” form, updates the password in Supabase, then offers a link to open the app.

## Setup

1. **Config**  
   Copy `config.example.js` to `config.js` and set:
   - `SUPABASE_URL` – your Supabase project URL (same as in the app).
   - `SUPABASE_ANON_KEY` – your Supabase anon/public key (same as in the app).
   - `APP_DEEP_LINK` – optional; default `myapp://social/groups`.

   Or edit the variables at the top of the `<script>` in `reset-password.html` and omit `config.js`.

2. **Supabase**  
   In Supabase Dashboard → Authentication → URL Configuration → Redirect URLs, add the **exact** URL where this page will live (e.g. `https://setup.mealoffortune.io/reset-password`).

3. **Hosting**  
   Upload the contents of `web/` to your host (e.g. Vercel, Netlify, S3 + CloudFront, or any static host). The reset page must be served at the same path you added in Supabase.

4. **App (optional)**  
   To make the email link open this page (so it works in any browser), set `EXPO_PUBLIC_PASSWORD_RESET_REDIRECT_URL` to that URL (e.g. `https://setup.mealoffortune.io/reset-password`) in your app env. Otherwise the app keeps using the deep link `myapp://social/auth-callback`.

See **`docs/PASSWORD-RESET-REDIRECT.md`** for full flow and options.
