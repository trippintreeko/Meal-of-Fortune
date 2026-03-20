/**
 * Round purpose: what this round is selecting for the meal.
 * Used by the round screen to pass context to the mini-game component.
 */
export type RoundPurpose =
  | 'base'
  | 'protein_vegetable'
  | 'all_ingredients'
  | 'cooking_method'

/** Round index (0, 1): rounds collect ingredients (base/protein/vegetable) */
export const ROUND_INDEX_TO_PURPOSE: Record<number, RoundPurpose> = {
  0: 'all_ingredients',
  1: 'all_ingredients',
  2: 'all_ingredients'
}

export const ROUND_PURPOSE_LABELS: Record<RoundPurpose, string> = {
  base: 'Pick a base',
  protein_vegetable: 'Pick protein & vegetable',
  all_ingredients: 'Pick what you want',
  cooking_method: 'Pick cooking method'
}

/**
 * Result from a single round. Shape depends on round purpose.
 * all_ingredients: used for round 0 and 1; items interacted with in BOTH rounds get higher weight.
 * cooking_method: (legacy) was round 3; kept for type compatibility but not used while round 3 is hidden.
 */
export type RoundResult =
  | { purpose: 'base'; baseIds: string[] }
  | { purpose: 'protein_vegetable'; proteinIds: string[]; vegetableIds: string[] }
  | { purpose: 'all_ingredients'; baseIds: string[]; proteinIds: string[]; vegetableIds: string[]; seasoningIds?: string[]; garnishIds?: string[] }
  | { purpose: 'cooking_method'; method: string }
  | { purpose: 'cooking_method'; methods: string[] }

export type MealType = 'breakfast' | 'lunch' | 'dinner'
