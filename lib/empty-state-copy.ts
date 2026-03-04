/** Helpful and light-hearted messages when "Meals I want" or "Saved meals" are empty. */

export const EMPTY_MEALS_HELPFUL = [
  'Tap a button below to discover meals — minigame, feelings, or gallery.',
  'No meals saved yet. Play the minigame or browse the gallery to add some.',
  'Your list is empty. Spin the wheel, pick by mood, or explore the gallery.'
]

export const EMPTY_MEALS_FUNNY = [
  "Not being hungry, I guess? Tap below when you're ready to eat.",
  'Zero meals. The fridge is judging you. Tap a button to fix that.',
  'Nothing here yet. Even a rubber duck needs a meal plan.',
  'Empty list. Tap something below — we promise it’s not a trap.'
]

export const EMPTY_CALENDAR_HELPFUL = [
  'Save meals from the game or gallery, then they’ll show up here.',
  'No saved meals yet. Add some from the minigame or food gallery first.',
  'Tap a button below to find meals you can add to your calendar.'
]

export const EMPTY_CALENDAR_FUNNY = [
  "Not being hungry, I guess? Save some meals and they’ll appear here.",
  'Your calendar’s empty. Give it something to look forward to.',
  'No saved meals. The calendar is just a grid of hope until you add some.'
]

/** Pick one message from helpful and funny lists (alternates by day so it’s stable per day). */
export function getEmptyMealsMessage (): string {
  const day = Math.floor(Date.now() / (24 * 60 * 60 * 1000))
  const helpful = EMPTY_MEALS_HELPFUL[day % EMPTY_MEALS_HELPFUL.length]
  const funny = EMPTY_MEALS_FUNNY[day % EMPTY_MEALS_FUNNY.length]
  return (day % 2 === 0 ? helpful : funny)
}

export function getEmptyCalendarMessage (): string {
  const day = Math.floor(Date.now() / (24 * 60 * 60 * 1000))
  const helpful = EMPTY_CALENDAR_HELPFUL[day % EMPTY_CALENDAR_HELPFUL.length]
  const funny = EMPTY_CALENDAR_FUNNY[day % EMPTY_CALENDAR_FUNNY.length]
  return (day % 2 === 0 ? helpful : funny)
}
