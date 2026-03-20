/**
 * Canonical list of cuisines used across the app:
 * - Feelings → Cuisine tab
 * - Food gallery → Sort by Cuisine Type
 * - Food preferences → Favorite cuisines
 *
 * Aligned with Spoonacular-supported cuisines where possible; same order everywhere.
 */

export const CUISINE_OPTIONS: string[] = [
  'African',
  'American',
  'Cajun',
  'Caribbean',
  'Chinese',
  'Eastern European',
  'French',
  'German',
  'Greek',
  'Indian',
  'Irish',
  'Italian',
  'Japanese',
  'Jewish',
  'Korean',
  'Latin American',
  'Mediterranean',
  'Mexican',
  'Middle Eastern',
  'Nordic',
  'Southern',
  'Spanish',
  'Thai',
  'Vietnamese'
]

/** Label for "all" / no filter (e.g. in gallery dropdown). */
export const CUISINE_ALL_LABEL = 'All cuisines'

/** Check if a string is in our canonical list (case-insensitive match). */
export function isKnownCuisine (value: string): boolean {
  const v = (value ?? '').trim()
  if (!v) return false
  return CUISINE_OPTIONS.some((c) => c.localeCompare(v, undefined, { sensitivity: 'accent' }) === 0)
}

/** Normalize cuisine string to canonical form if it matches (e.g. "italian" → "Italian"). */
export function normalizeCuisine (value: string): string | null {
  const v = (value ?? '').trim()
  if (!v) return null
  const found = CUISINE_OPTIONS.find((c) => c.localeCompare(v, undefined, { sensitivity: 'accent' }) === 0)
  return found ?? v
}
