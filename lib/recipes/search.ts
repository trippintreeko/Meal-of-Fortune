/**
 * Recipe and meal search URL helpers.
 * Used by MealDetailModal for "Find near me" and "Recipe" links.
 */

/**
 * URL to search for places to get this meal nearby (e.g. restaurants).
 */
export function getMealNearMeUrl (mealTitle?: string): string {
  const query = (mealTitle ?? 'food').trim() || 'food'
  return `https://www.google.com/maps/search/${encodeURIComponent(query + ' near me')}`
}

/**
 * URL to search for recipes for this meal (when no in-app recipe is linked).
 */
export function getRecipeSearchUrl (mealTitle: string): string {
  const query = (mealTitle ?? 'recipe').trim() || 'recipe'
  return `https://www.google.com/search?q=${encodeURIComponent(query + ' recipe')}`
}
