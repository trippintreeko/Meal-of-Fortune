/**
 * Profile settings and preferences types.
 * Used by profile/settings screens and useProfileSettings hook.
 */

export type ThemeMode = 'light' | 'dark' | 'system'
export type FontSize = 'small' | 'medium' | 'large'
export type ProfileVisibility = 'public' | 'friends' | 'private'
export type PortionPreference = 'small' | 'medium' | 'large'

export type NotificationChannel = { push: boolean; email: boolean }

export type NotificationSettings = {
  meal_reminders: { enabled: boolean; default_time: string }
  friend_requests: NotificationChannel
  group_invites: NotificationChannel
  voting_started: NotificationChannel
  new_suggestions: NotificationChannel
  votes_on_mine: NotificationChannel
  voting_results: NotificationChannel
  deadline_reminders: { enabled: boolean; minutes_before: number[] }
  weekly_summary: boolean
  marketing_emails: boolean
  quiet_hours: { enabled: boolean; start: string; end: string }
}

export type PrivacySettings = {
  profile_visibility: ProfileVisibility
  show_friend_code_in_search: boolean
  show_dietary_preferences: boolean
  allow_email_add: boolean
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  meal_reminders: { enabled: true, default_time: '18:00' },
  friend_requests: { push: true, email: true },
  group_invites: { push: true, email: true },
  voting_started: { push: true, email: false },
  new_suggestions: { push: true, email: false },
  votes_on_mine: { push: true, email: false },
  voting_results: { push: true, email: true },
  deadline_reminders: { enabled: true, minutes_before: [30, 60, 120] },
  weekly_summary: false,
  marketing_emails: false,
  quiet_hours: { enabled: false, start: '22:00', end: '08:00' }
}

export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  profile_visibility: 'public',
  show_friend_code_in_search: true,
  show_dietary_preferences: true,
  allow_email_add: true
}

export const ACCENT_COLORS: { id: string; label: string; value: string }[] = [
  { id: 'green', label: 'Green', value: '#22c55e' },
  { id: 'blue', label: 'Blue', value: '#3b82f6' },
  { id: 'purple', label: 'Purple', value: '#8b5cf6' },
  { id: 'orange', label: 'Orange', value: '#f97316' }
]

export const DIETARY_RESTRICTIONS = [
  'vegetarian',
  'vegan',
  'gluten_free',
  'dairy_free',
  'nut_allergy',
  'shellfish_allergy',
  'kosher',
  'halal',
  'keto',
  'paleo'
] as const

export type DietaryRestrictionId = typeof DIETARY_RESTRICTIONS[number]
