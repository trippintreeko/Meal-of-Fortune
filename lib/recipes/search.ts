/**
 * Meal search URL helpers.
 * Used by MealDetailModal for "Find near me".
 */

/**
 * URL to search for places to get this meal nearby (e.g. restaurants).
 */
export function getMealNearMeUrl (mealTitle?: string): string {
  const query = (mealTitle ?? 'food').trim() || 'food'
  return `https://www.google.com/maps/search/${encodeURIComponent(query + ' near me')}`
}
