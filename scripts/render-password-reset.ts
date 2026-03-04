/**
 * Renders the PasswordReset React Email template to HTML for Supabase.
 * Paste output into Supabase Dashboard → Authentication → Email Templates → Reset password.
 *
 * Run: npm run render-password-reset
 *
 * Supabase variables: {{ .ConfirmationURL }}, {{ .Email }}
 * See https://supabase.com/docs/guides/auth/auth-email-templates
 */

import React from 'react'
import { render } from '@react-email/render'
import PasswordReset from '../emails/PasswordReset'

const SUPABASE_CONFIRMATION_URL = '{{ .ConfirmationURL }}'
const SUPABASE_EMAIL = '{{ .Email }}'

async function main () {
  const html = await render(
    React.createElement(PasswordReset, {
      userEmail: SUPABASE_EMAIL,
      resetUrl: SUPABASE_CONFIRMATION_URL,
      userName: 'there'
    })
  )
  console.log(html)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
