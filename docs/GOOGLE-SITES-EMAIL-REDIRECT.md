# Google Sites pages for email redirects

Supabase sends users to a **redirect URL** when they click links in emails (sign-up confirmation, magic link, password reset). You can use **one Google Sites page** for all of these; it forwards the user to your app with the auth tokens preserved.

## Redirects you need

| Email type        | Supabase redirect | Same page? |
|-------------------|-------------------|------------|
| Confirm signup    | Yes               | Yes        |
| Magic link        | Yes               | Yes        |
| Password reset    | Yes               | Yes        |

Use **one** Google Sites page (e.g. `auth-callback`) for all. Supabase will send tokens in the URL hash; the page redirects to your app with that hash.

---

## 1. Create the Google Site

1. Go to [sites.google.com](https://sites.google.com) and create a new site (or use an existing one).
2. Create **one page** for the redirect, e.g. **Auth callback** (URL path like `auth-callback` or `auth`).
3. Publish the site and note the full URL, e.g.  
   `https://sites.google.com/view/your-site-name/auth-callback`  
   (Exact URL depends on your site name and page path.)

---

## 2. Add the redirect content to the page

1. On the Google Sites page, add a block → **Embed** → **Embed code**.
2. Paste the contents of **`web/google-sites-auth-redirect.html`** from this repo (see below).
3. In the pasted HTML, set **`APP_REDIRECT_URL`** to one of:
   - **App deep link (native):** `myapp://social/auth-callback`  
     (Opens the installed app; use your custom scheme if different.)
   - **Expo web app:** `https://your-expo-web-domain.com/social/auth-callback`  
     (Use if you want the link to open in the browser and your app is deployed on the web.)
4. Save and publish the page.

---

## 3. Configure Supabase

1. Supabase Dashboard → **Authentication** → **URL Configuration**.
2. **Site URL:** your app’s main URL (e.g. `https://your-app.com` or `myapp://` for deep link).
3. **Redirect URLs:** add the **exact** Google Sites page URL, e.g.  
   `https://sites.google.com/view/your-site-name/auth-callback`
4. Save.

---

## 4. Configure the app (.env)

Set the redirect URL so the app tells Supabase where to send users after sign-up / magic link:

```env
EXPO_PUBLIC_EMAIL_CONFIRM_REDIRECT_URL=https://sites.google.com/view/your-site-name/auth-callback
```

For **password reset**, the app uses the same env var when calling `resetPasswordForEmail` (or you can set `EXPO_PUBLIC_PASSWORD_RESET_REDIRECT_URL` to the same value).

---

## Optional: second page for “Set new password” only

If you want a separate Google Sites page that only says “You’re being taken to the app to set your new password”, you can duplicate the same embed and use the same **`APP_REDIRECT_URL`**. Then in Supabase add that second URL to **Redirect URLs** and use it only as the password-reset redirect. Functionally it does the same thing; the only difference is the short message on the page.

---

## Files in this repo

- **`web/google-sites-auth-redirect.html`** – HTML to paste into the Google Sites embed. Edit `APP_REDIRECT_URL` in the script (e.g. `myapp://social/auth-callback` or your Expo web URL) before pasting.
