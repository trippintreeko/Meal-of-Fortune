/**
 * Renders the AccountDeleted React Email template to HTML.
 * This template is NOT used by Supabase; it is sent by your app/Edge Function
 * when a user deletes their account (e.g. delete-account Edge Function + Resend API).
 *
 * Run with example data: npm run render-account-deleted
 * Use the output to preview the email, or call Resend with the rendered HTML
 * and real userEmail, userName, supportEmail when sending after account deletion.
 */

import React from 'react'
import { render } from '@react-email/render'
import AccountDeleted from '../emails/AccountDeleted'

async function main () {
  const html = await render(
    React.createElement(AccountDeleted, {
      userEmail: 'user@example.com',
      userName: 'User',
      supportEmail: 'support@mealoffortune.io'
    })
  )
  console.log(html)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
