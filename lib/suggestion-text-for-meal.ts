import type { SavedMeal } from '@/types/calendar'

/** Build suggestion text for a saved meal (title + seasonings) for voting. */
export function suggestionTextForMeal (meal: SavedMeal): string {
  const parts = [meal.title]
  if (meal.seasonings?.length) parts.push(`(${meal.seasonings.slice(0, 4).join(', ')})`)
  return parts.join(' ')
}
