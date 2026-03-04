/**
 * Renders the EmailVerification React Email template to HTML.
 * Use with Supabase: pass Supabase template variables so the output can be
 * pasted into Supabase Dashboard → Authentication → Email Templates → Confirm signup.
 *
 * Run: npx tsx scripts/render-verification-email.ts
 * Or:  npm run render-verification-email
 *
 * Supabase variables: {{ .ConfirmationURL }} and {{ .Email }}
 * See https://supabase.com/docs/guides/auth/auth-email-templates
 */

import React from 'react'
import { render } from '@react-email/render'
import EmailVerification from '../emails/EmailVerification'

const SUPABASE_CONFIRMATION_URL = '{{ .ConfirmationURL }}'
const SUPABASE_EMAIL = '{{ .Email }}'

async function main () {
  const html = await render(
    React.createElement(EmailVerification, {
      userEmail: SUPABASE_EMAIL,
      verificationUrl: SUPABASE_CONFIRMATION_URL
    })
  )
  console.log(html)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
