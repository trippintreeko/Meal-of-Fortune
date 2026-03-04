/** Replace with your app's support email for Report a problem / Feature request mailto links */
export const SUPPORT_EMAIL = 'support@example.com'

export function reportProblemMailto (body?: string): string {
  const subject = encodeURIComponent('Report a problem – Meal Decision App')
  const b = body ? encodeURIComponent(body) : ''
  return `mailto:${SUPPORT_EMAIL}?subject=${subject}${b ? `&body=${b}` : ''}`
}

export function featureRequestMailto (body?: string): string {
  const subject = encodeURIComponent('Feature request – Meal Decision App')
  const b = body ? encodeURIComponent(body) : ''
  return `mailto:${SUPPORT_EMAIL}?subject=${subject}${b ? `&body=${b}` : ''}`
}
