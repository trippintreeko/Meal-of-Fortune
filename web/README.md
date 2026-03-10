# Web pages

This folder contains standalone web pages used by the app.

## Privacy policy (`privacy.html`)

Static privacy policy page for **store listings** (Google Play, App Store). Host this file and use its URL as the “Privacy policy URL” in your store listing.

- **URL to use:** e.g. `https://yourdomain.com/privacy.html` or `https://yourdomain.com/privacy` (if your host serves it at `/privacy`).
- Deploy `privacy.html` (and optionally the rest of `web/`) to your static host (GitHub Pages, Netlify, Vercel, S3, etc.).

---

## Reset password (`reset-password.html`)

This page handles the **password reset** flow when the user clicks the link in the reset email. Supabase redirects to this page with tokens in the URL; the page sets the session, shows a “Set new password” form, updates the password in Supabase, then offers a link to open the app.

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

---

## Google Sites email redirect (`google-sites-auth-redirect.html`)

Use this as the **single redirect page** for all Supabase email links (confirm signup, magic link, password reset). Paste the file contents into a Google Sites page (Embed → Embed code), set `APP_REDIRECT_URL` in the script (e.g. `myapp://social/auth-callback`), then add that Google Sites page URL to Supabase Redirect URLs and to `EXPO_PUBLIC_EMAIL_CONFIRM_REDIRECT_URL` in `.env`.

See **`docs/GOOGLE-SITES-EMAIL-REDIRECT.md`** for step-by-step setup.
