export type MealSlot = 'breakfast' | 'lunch' | 'dinner'

/** A saved meal template (ingredients) that can be added to the calendar */
export type SavedMeal = {
  id: string
  title: string
  baseId: string
  proteinId: string
  vegetableId: string
  method: string
  seasonings?: string[]
  garnishes?: string[]
  createdAt: number
}

/** A meal scheduled on a specific date (references SavedMeal or inline snapshot) */
export type CalendarEvent = {
  id: string
  date: string // YYYY-MM-DD
  mealSlot: MealSlot
  savedMealId: string | null // if null, use inline meal
  title: string
  baseId?: string
  proteinId?: string
  vegetableId?: string
  method?: string
  reminderAt?: string | null // ISO string or null
  notificationId?: string | null // expo-notifications id for cancellation
  /** Set when event is created from a voting result */
  votingSessionId?: string
  voteWinnerId?: string
  voteCount?: number
  totalVoters?: number
  suggestedBy?: string
  /** true when added from results (any suggestion) */
  isVotedMeal?: boolean
  /** meal_suggestions.id for voted meals */
  originalSuggestionId?: string
  isWinner?: boolean
  /** true when from admin "schedule for group" */
  scheduledByAdmin?: boolean
  /** true when from admin suggestion (pending accept/decline) */
  isSuggestedEvent?: boolean
  /** scheduled_group_meals.id when from suggestion flow */
  scheduledGroupMealId?: string
}

export function dateKey (d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseDateKey (key: string): Date {
  const [y, m, day] = key.split('-').map(Number)
  return new Date(y, m - 1, day)
}

export function addDaysToDateKey (key: string, days: number): string {
  const d = parseDateKey(key)
  d.setDate(d.getDate() + days)
  return dateKey(d)
}

/** e.g. "Jan 31" */
export function formatShortDate (key: string): string {
  return parseDateKey(key).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const SLOT_ORDER: MealSlot[] = ['breakfast', 'lunch', 'dinner']
export function slotOrder (a: MealSlot, b: MealSlot): number {
  return SLOT_ORDER.indexOf(a) - SLOT_ORDER.indexOf(b)
}
