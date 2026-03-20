/**
 * Dislikes / not-today matching for gallery meals and recipes.
 * Preference ids are usually Spoonacular ingredient ids from ingredient_assets; names resolve from there or food_items (UUID).
 */

import { supabase } from '@/lib/supabase'
import {
  ALLERGY_DIET_IDS_ON_FAVORITES_USE_EXCLUDED_ONLY,
  getExcludedFoodNames,
  normalizeFoodItemName
} from '@/lib/diets'

export type AvoidListMealLike = {
  title?: string
  description?: string
  ingredientIds?: string[]
  ingredientNamesNormalized?: string[]
  base?: string
  protein?: string
  vegetable?: string
}

export function preferenceIdsForAvoidCheck (meal: AvoidListMealLike): string[] {
  const fromRecipe = meal.ingredientIds ?? []
  if (fromRecipe.length > 0) return fromRecipe
  return [meal.base, meal.protein, meal.vegetable].filter(Boolean) as string[]
}

function escapeRegExp (s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function textBlobMatchesBlockedNames (blobLower: string, blockedFoodNamesNormalized: Set<string>): boolean {
  for (const blocked of blockedFoodNamesNormalized) {
    if (!blocked) continue
    if (blocked.includes(' ')) {
      if (blobLower.includes(blocked)) return true
    } else {
      const re = new RegExp(`\\b${escapeRegExp(blocked)}\\b`, 'i')
      if (re.test(blobLower)) return true
    }
  }
  return false
}

function mealViolatesNameBlobChecks (
  meal: AvoidListMealLike,
  blockedFoodNamesNormalized: Set<string>
): boolean {
  if (blockedFoodNamesNormalized.size === 0) return false
  const ings = meal.ingredientNamesNormalized ?? []
  for (const ing of ings) {
    if (!ing) continue
    for (const blocked of blockedFoodNamesNormalized) {
      if (!blocked) continue
      if (ing === blocked || ing.includes(blocked) || blocked.includes(ing)) return true
    }
  }
  const blob = `${meal.title ?? ''} ${meal.description ?? ''}`.toLowerCase()
  if (textBlobMatchesBlockedNames(blob, blockedFoodNamesNormalized)) return true
  return false
}

/** True if meal/recipe should be hidden (dislikes OR not-today on preference ids). */
export function mealViolatesAvoidLists (
  meal: AvoidListMealLike,
  blockedFoodNamesNormalized: Set<string>,
  isDisliked: (foodId: string) => boolean,
  isNotToday: (foodId: string) => boolean
): boolean {
  for (const id of preferenceIdsForAvoidCheck(meal)) {
    if (isDisliked(id) || isNotToday(id)) return true
  }
  return mealViolatesNameBlobChecks(meal, blockedFoodNamesNormalized)
}

/** Dislikes only (e.g. game results — not-today uses separate collected-based rules). */
export function mealViolatesDislikesOnly (
  meal: AvoidListMealLike,
  dislikeNamesNormalized: Set<string>,
  dislikeIdSet: Set<string>
): boolean {
  for (const id of preferenceIdsForAvoidCheck(meal)) {
    if (dislikeIdSet.has(id)) return true
  }
  return mealViolatesNameBlobChecks(meal, dislikeNamesNormalized)
}

/** Load normalized display names for preference food ids (Spoonacular + legacy UUIDs). */
export async function fetchFoodNamesForPreferenceIds (ids: string[]): Promise<Set<string>> {
  const unique = [...new Set(ids)].filter(Boolean)
  if (unique.length === 0) return new Set()

  const next = new Set<string>()
  const uuidIds = unique.filter((id) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
  const spoonIds = [...new Set(unique.filter((id) => /^\d+$/.test(id)).map((id) => parseInt(id, 10)))]

  if (uuidIds.length > 0) {
    const { data, error } = await supabase.from('food_items').select('name').in('id', uuidIds)
    if (!error && data) {
      for (const row of data as Array<{ name: string | null }>) {
        const n = normalizeFoodItemName(row.name ?? '')
        if (n) next.add(n)
      }
    }
  }
  if (spoonIds.length > 0) {
    const { data, error } = await supabase
      .from('ingredient_assets')
      .select('name')
      .in('spoonacular_ingredient_id', spoonIds)
    if (!error && data) {
      for (const row of data as Array<{ name: string | null }>) {
        const n = normalizeFoodItemName(row.name ?? '')
        if (n) next.add(n)
      }
    }
  }
  return next
}

export async function fetchBlockedNamesForDislikesAndNotToday (
  dislikeIds: string[],
  notTodayIds: string[]
): Promise<Set<string>> {
  const merged = [...new Set([...dislikeIds, ...notTodayIds])]
  return fetchFoodNamesForPreferenceIds(merged)
}

/**
 * Diets applied on the Favorites tab that mean “never show meals with these” (nut allergy, etc.).
 */
export function mergeFavoriteAppliedAllergyExcludedNames (
  base: Set<string>,
  appliedFavoriteDietIds: string[]
): Set<string> {
  const out = new Set(base)
  for (const dietId of appliedFavoriteDietIds) {
    if (!ALLERGY_DIET_IDS_ON_FAVORITES_USE_EXCLUDED_ONLY.includes(dietId)) continue
    for (const n of getExcludedFoodNames(dietId)) {
      if (n) out.add(n)
    }
  }
  return out
}

export async function fetchRecipeIngredientNamesMap (recipeIds: number[]): Promise<Map<number, string[]>> {
  const unique = [...new Set(recipeIds)].filter((id): id is number => id != null && Number.isInteger(id))
  if (unique.length === 0) return new Map()
  const { data, error } = await supabase
    .from('recipe_ingredients')
    .select('spoonacular_recipe_id, name')
    .in('spoonacular_recipe_id', unique)
  if (error || !data) return new Map()
  const byRecipe = new Map<number, Set<string>>()
  for (const row of data as Array<{ spoonacular_recipe_id: number; name: string }>) {
    const n = normalizeFoodItemName(row.name)
    if (!n) continue
    if (!byRecipe.has(row.spoonacular_recipe_id)) byRecipe.set(row.spoonacular_recipe_id, new Set())
    byRecipe.get(row.spoonacular_recipe_id)!.add(n)
  }
  const out = new Map<number, string[]>()
  for (const [recipeId, set] of byRecipe.entries()) {
    out.set(recipeId, [...set])
  }
  return out
}
