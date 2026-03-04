/**
 * Cooking methods used by the meal generator and the cooking-method sorting game.
 * "dog" = feed the dog (discard / don't use for this meal).
 */

export const COOKING_METHOD_IDS = [
  'bake',
  'stove',
  'grill',
  'boil',
  'raw',
  'steam',
  'ferment',
  'preserve',
  'pressure_cook',
  'slow_cook',
  'sous_vide',
  'dehydrate',
  'spherify',
  'flambe',
  'grind',
  'mill',
  'dog'
] as const

export type CookingMethodId = typeof COOKING_METHOD_IDS[number]

/** Methods that produce a real cooking style for meals (excludes "dog") */
export const MEAL_COOKING_METHODS: readonly CookingMethodId[] = COOKING_METHOD_IDS.filter(m => m !== 'dog')

export const COOKING_METHOD_LABELS: Record<CookingMethodId, string> = {
  bake: 'Bake',
  stove: 'Stove',
  grill: 'Grill',
  boil: 'Boil',
  raw: 'Raw',
  steam: 'Steam',
  ferment: 'Ferment',
  preserve: 'Preserve',
  pressure_cook: 'Pressure cook',
  slow_cook: 'Slow cook',
  sous_vide: 'Sous vide',
  dehydrate: 'Dehydrate',
  spherify: 'Spherify',
  flambe: 'Flambé',
  grind: 'Grind',
  mill: 'Mill',
  dog: 'Feed the dog'
}

export const DEFAULT_COOKING_METHOD: Exclude<CookingMethodId, 'dog'> = 'grill'

/** Check if a string is a valid meal cooking method (not dog) */
export function isMealCookingMethod (value: string): value is CookingMethodId {
  return MEAL_COOKING_METHODS.includes(value as CookingMethodId)
}

/** Normalize method for meal generation: must be one of the 6 real methods; default grill */
export function normalizeCookingMethod (value: string | undefined): CookingMethodId {
  if (value && isMealCookingMethod(value)) return value as CookingMethodId
  return DEFAULT_COOKING_METHOD
}

/** Normalize a DB/storage method string (e.g. "baked", "grilled") to CookingMethodId for filtering */
export function normalizeCookingMethodFromDb (value: string | undefined): Exclude<CookingMethodId, 'dog'> {
  if (!value) return DEFAULT_COOKING_METHOD
  const key = value.trim().toLowerCase()
  const fromMap = LEGACY_METHOD_MAP[key]
  if (fromMap) return fromMap
  if (isMealCookingMethod(key) && key !== 'dog') return key as Exclude<CookingMethodId, 'dog'>
  return DEFAULT_COOKING_METHOD
}

/** Past tense / display form for UI (e.g. "Grilled", "Baked") */
export const COOKING_METHOD_DISPLAY_PAST: Record<Exclude<CookingMethodId, 'dog'>, string> = {
  bake: 'Baked',
  stove: 'Stovetop',
  grill: 'Grilled',
  boil: 'Boiled',
  raw: 'Raw',
  steam: 'Steamed',
  ferment: 'Fermented',
  preserve: 'Preserved',
  pressure_cook: 'Pressure-cooked',
  slow_cook: 'Slow-cooked',
  sous_vide: 'Sous vide',
  dehydrate: 'Dehydrated',
  spherify: 'Spherified',
  flambe: 'Flambéed',
  grind: 'Ground',
  mill: 'Milled'
}

/** Form used for dish-name matching in meal-names (e.g. 'grilled', 'baked') */
export const COOKING_METHOD_DISH_MATCH: Record<Exclude<CookingMethodId, 'dog'>, string> = {
  bake: 'baked',
  stove: 'fried',
  grill: 'grilled',
  boil: 'boiled',
  raw: 'raw',
  steam: 'steamed',
  ferment: 'fermented',
  preserve: 'preserved',
  pressure_cook: 'pressure-cooked',
  slow_cook: 'slow-cooked',
  sous_vide: 'sous vide',
  dehydrate: 'dehydrated',
  spherify: 'spherified',
  flambe: 'flambeed',
  grind: 'ground',
  mill: 'milled'
}

const LEGACY_METHOD_MAP: Record<string, Exclude<CookingMethodId, 'dog'>> = {
  grilled: 'grill', grilled_: 'grill',
  baked: 'bake', bake: 'bake',
  fried: 'stove', stove: 'stove', stovetop: 'stove',
  boiled: 'boil', boil: 'boil',
  raw: 'raw',
  steamed: 'steam', steam: 'steam',
  fermented: 'ferment', ferment: 'ferment',
  preserved: 'preserve', preserve: 'preserve',
  pressure_cook: 'pressure_cook', 'pressure-cooked': 'pressure_cook',
  slow_cook: 'slow_cook', 'slow-cooked': 'slow_cook',
  sous_vide: 'sous_vide',
  dehydrated: 'dehydrate', dehydrate: 'dehydrate',
  spherified: 'spherify', spherify: 'spherify',
  flambe: 'flambe', flambéed: 'flambe',
  ground: 'grind', grind: 'grind',
  milled: 'mill', mill: 'mill'
}

export function getMethodDisplayPast (value: string | undefined): string {
  if (!value) return COOKING_METHOD_DISPLAY_PAST[DEFAULT_COOKING_METHOD]
  const key = value.trim().toLowerCase()
  const method: Exclude<CookingMethodId, 'dog'> | null =
    LEGACY_METHOD_MAP[key] ?? (isMealCookingMethod(key) && key !== 'dog' ? (key as Exclude<CookingMethodId, 'dog'>) : null)
  if (method) return COOKING_METHOD_DISPLAY_PAST[method]
  return COOKING_METHOD_DISPLAY_PAST[DEFAULT_COOKING_METHOD]
}

/** Return method string for meal combo (dish matching and storage) */
export function getMethodForMeal (value: string | undefined): string {
  const normalized = normalizeCookingMethod(value)
  return normalized === 'dog' ? 'grilled' : COOKING_METHOD_DISH_MATCH[normalized as Exclude<CookingMethodId, 'dog'>]
}
