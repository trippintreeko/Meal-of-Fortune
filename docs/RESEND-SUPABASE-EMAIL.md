# Resend + Supabase for auth emails

Supabase can send auth emails (e.g. signup confirmation, password reset) using its built-in sender, but that is rate-limited. Using **Resend** as custom SMTP lets you send more emails and use your own domain.

---

## 1. Resend account and API key

1. Sign up at [resend.com](https://resend.com).
2. Go to **API Keys** → **Create API Key** (name it e.g. `Supabase Auth`), **Full access**.
3. Copy the key and store it somewhere safe (you’ll use it as the SMTP password in Supabase).

---

## 2. Custom SMTP in Supabase

1. Open **Supabase Dashboard** → your project → **Project Settings** (gear) → **Authentication**.
2. Scroll to **SMTP Settings** and turn on **Enable Custom SMTP**.
3. Fill in:

   | Field        | Value              |
   |-------------|--------------------|
   | Sender email  | **`donotreply@setup.mealoffortune.io`** |
   | Sender name  | e.g. `Meal Vote`    |
   | Host         | `smtp.resend.com`  |
   | Port         | `465` (or `587` for TLS) |
   | Username     | `resend`           |
   | Password     | Your **Resend API key** (from step 1) |

4. Save. Supabase will use Resend for confirmation emails, password reset, magic links, etc.

---

## 3. Sender address: donotreply@setup.mealoffortune.io

Auth emails (verification, password reset) are sent **from** `donotreply@setup.mealoffortune.io`.

- **Supabase:** Set **Sender email** to `donotreply@setup.mealoffortune.io` (see table in §2).
- **Resend:** The domain must be verified before you can send from it.
  1. In [Resend](https://resend.com) go to **Domains** → **Add Domain**.
  2. Add **`setup.mealoffortune.io`** (or the parent domain Resend suggests).
  3. Add the DNS records Resend provides (e.g. SPF, DKIM) at your DNS host for `mealoffortune.io` / `setup.mealoffortune.io`.
  4. After verification, Supabase can send using `donotreply@setup.mealoffortune.io`.


---

## 4. Custom email templates (React Email)

All auth and account emails are sent **from** `donotreply@setup.mealoffortune.io` when Supabase SMTP is set to that sender (§2). The project includes three **React Email** templates.

### 4.1 Verification (signup confirmation)

- **Template:** `emails/EmailVerification.tsx` — props: `userEmail`, `verificationUrl`.
- **Generate HTML for Supabase:**  
  Run `npm run render-verification-email`, copy the output, then paste into **Supabase Dashboard** → **Authentication** → **Email Templates** → **Confirm signup**. Supabase replaces `{{ .ConfirmationURL }}` and `{{ .Email }}` when sending.

### 4.2 Password reset

- **Template:** `emails/PasswordReset.tsx` — props: `userEmail`, `resetUrl`, `userName`.
- **Generate HTML for Supabase:**  
  Run `npm run render-password-reset`, copy the output, then paste into **Supabase Dashboard** → **Authentication** → **Email Templates** → **Reset password**. Supabase replaces `{{ .ConfirmationURL }}` and `{{ .Email }}` when sending.

### 4.3 Account deleted (confirmation after user deletes account)

- **Template:** `emails/AccountDeleted.tsx` — props: `userEmail`, `userName`, `supportEmail`.
- **Not a Supabase template.** This email is sent by your backend (e.g. the `delete-account` Edge Function) when a user successfully deletes their account. Use the Resend API to send it: render the template with real `userEmail`, `userName`, and `supportEmail` (e.g. `support@mealoffortune.io`), then send the HTML via Resend with **From:** `donotreply@setup.mealoffortune.io`.
- **Preview:** Run `npm run render-account-deleted` to output example HTML.

---

## 5. No app code changes

Auth emails are sent by Supabase when users sign up, reset password, etc. You only configure Supabase + Resend as above; the app keeps using Supabase Auth as usual.

---

## 6. Protected routes and “middleware” (this app)

This app is **Expo / React Native**, not Next.js, so there is no `middleware.ts` file. Auth-based redirects are handled by:

- **`components/AuthRedirect.tsx`** – Uses `useSegments()` and `useSocialAuth()`. If the user is **not** signed in and the current route is protected (e.g. `profile/settings`, `social/friends`, `social/groups`), it redirects to **`/social/login`**.
- **Root layout** – Renders `<AuthRedirect />` so that redirect runs on every navigation.

So unauthenticated users who open a protected screen are sent to the login screen automatically.
