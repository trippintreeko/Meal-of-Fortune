/**
 * Maps ingredient combinations (base + protein + vegetable + method + seasonings/garnishes)
 * to recognizable dish names and cultural cuisines for display
 * (e.g. Thai Rice Bowl, Jamaican Taco, Indian Curry).
 * Dish rules are checked first; then cuisine is inferred from seasonings/garnishes.
 */

export type MealCombo = {
  baseName: string
  proteinName: string
  vegetableName: string
  cookingMethod: string
  seasonings?: string[]
  garnishes?: string[]
}

export type MealDisplay = {
  title: string
  subtitle: string
}

const n = (s: string) => s.trim().toLowerCase()

/** Cuisine rules: match when combo has at least 2 of these ingredients (seasonings or garnishes). */
type CuisineRule = {
  cuisine: string
  ingredients: string[]
}

const CUISINE_RULES: CuisineRule[] = [
  { cuisine: 'Jamaican', ingredients: ['chili', 'ginger', 'garlic', 'allspice', 'thyme'] },
  { cuisine: 'Indian', ingredients: ['cumin', 'chili', 'garlic', 'ginger', 'turmeric', 'coriander'] },
  { cuisine: 'Thai', ingredients: ['ginger', 'basil', 'chili', 'lime', 'cilantro', 'fish sauce'] },
  { cuisine: 'Vietnamese', ingredients: ['ginger', 'lime', 'cilantro', 'sauce', 'green onions', 'mint'] },
  { cuisine: 'Chinese', ingredients: ['ginger', 'garlic', 'green onions', 'sauce', 'sesame seeds', 'soy'] },
  { cuisine: 'Japanese', ingredients: ['ginger', 'sesame seeds', 'sauce', 'green onions', 'soy'] },
  { cuisine: 'Korean', ingredients: ['chili', 'garlic', 'sesame seeds', 'green onions', 'ginger', 'soy'] },
  { cuisine: 'Mexican', ingredients: ['chili', 'lime', 'cilantro', 'cumin', 'hot sauce', 'avocado'] },
  { cuisine: 'Italian', ingredients: ['oregano', 'basil', 'garlic', 'parsley', 'cheese'] },
  { cuisine: 'Greek', ingredients: ['oregano', 'garlic', 'parsley', 'lime', 'cheese'] },
  { cuisine: 'Mediterranean', ingredients: ['oregano', 'basil', 'garlic', 'parsley', 'lime'] },
  { cuisine: 'French', ingredients: ['herbs', 'garlic', 'parsley', 'basil'] },
  { cuisine: 'Caribbean', ingredients: ['lime', 'cilantro', 'chili', 'ginger', 'allspice'] },
  { cuisine: 'Ethiopian', ingredients: ['cumin', 'chili', 'ginger', 'paprika', 'berbere'] },
  { cuisine: 'Lebanese', ingredients: ['cumin', 'garlic', 'parsley', 'lime', 'mint'] },
  { cuisine: 'Spanish', ingredients: ['paprika', 'garlic', 'parsley', 'herbs'] },
  { cuisine: 'Middle Eastern', ingredients: ['cumin', 'garlic', 'parsley', 'lime', 'paprika'] },
  { cuisine: 'Cajun', ingredients: ['paprika', 'garlic', 'chili', 'pepper', 'cumin'] },
  { cuisine: 'Southern American', ingredients: ['paprika', 'garlic', 'pepper', 'hot sauce'] },
  { cuisine: 'Filipino', ingredients: ['garlic', 'sauce', 'vinegar', 'pepper'] },
  { cuisine: 'Indonesian', ingredients: ['ginger', 'chili', 'garlic', 'lime', 'sauce'] },
  { cuisine: 'Malaysian', ingredients: ['ginger', 'chili', 'garlic', 'lime', 'cilantro'] },
  { cuisine: 'Peruvian', ingredients: ['lime', 'cilantro', 'garlic', 'chili', 'cumin'] },
  { cuisine: 'Brazilian', ingredients: ['lime', 'garlic', 'cilantro', 'chili', 'paprika'] },
  { cuisine: 'Moroccan', ingredients: ['cumin', 'ginger', 'garlic', 'paprika', 'cilantro'] },
  { cuisine: 'Turkish', ingredients: ['paprika', 'garlic', 'cumin', 'parsley', 'yogurt'] }
]

type DishRule = {
  dishName: string
  bases: string[]
  methods?: string[]
  proteins?: string[]
}

/** Rules ordered by specificity (more specific first). First match wins. */
const DISH_RULES: DishRule[] = [
  { dishName: 'Fried rice', bases: ['rice'], methods: ['fried'] },
  { dishName: 'Poke bowl', bases: ['rice'], proteins: ['fish', 'salmon', 'tuna'] },
  { dishName: 'Sushi bowl', bases: ['rice'], proteins: ['fish', 'salmon', 'shrimp'] },
  { dishName: 'Rice bowl', bases: ['rice'] },
  { dishName: 'Ramen', bases: ['noodles', 'ramen'] },
  { dishName: 'Noodle bowl', bases: ['noodles'] },
  { dishName: 'Pasta', bases: ['pasta'] },
  { dishName: 'Lasagna', bases: ['pasta'], methods: ['baked'] },
  { dishName: 'Burrito', bases: ['tortilla'], methods: ['grilled'] },
  { dishName: 'Taco', bases: ['tortilla'] },
  { dishName: 'Burrito bowl', bases: ['rice', 'beans'], proteins: ['chicken', 'beef', 'beans'] },
  { dishName: 'Quinoa bowl', bases: ['quinoa'] },
  { dishName: 'Bean bowl', bases: ['beans'] },
  { dishName: 'Sandwich', bases: ['bread'] },
  { dishName: 'Toast', bases: ['toast'] },
  { dishName: 'Oatmeal', bases: ['oatmeal'] },
  { dishName: 'Pancakes', bases: ['pancakes'] },
  { dishName: 'Yogurt parfait', bases: ['yogurt'] },
  { dishName: 'Cereal', bases: ['cereal'] },
  { dishName: 'Scrambled eggs', bases: ['toast', 'bread'], proteins: ['eggs'], methods: ['scrambled'] },
  { dishName: 'Stir-fry', bases: ['rice', 'noodles'], methods: ['fried'] }
]

function matchesRule (combo: MealCombo, rule: DishRule): boolean {
  const base = n(combo.baseName)
  const method = n(combo.cookingMethod)
  const protein = n(combo.proteinName)
  if (!rule.bases.some(b => n(b) === base)) return false
  if (rule.methods != null && rule.methods.length > 0 && !rule.methods.some(m => n(m) === method)) return false
  if (rule.proteins != null && rule.proteins.length > 0 && !rule.proteins.some(p => n(p) === protein)) return false
  return true
}

function getCuisine (combo: MealCombo): string | null {
  const have = new Set<string>()
  ;[(combo.seasonings ?? []), (combo.garnishes ?? [])].flat().forEach(s => have.add(n(s)))
  if (have.size === 0) return null
  for (const rule of CUISINE_RULES) {
    const matchCount = rule.ingredients.filter(ing => have.has(n(ing))).length
    if (matchCount >= 2) return rule.cuisine
  }
  return null
}

/** Capitalize first letter of each word for display */
function cap (s: string) {
  return s.trim().replace(/\b\w/g, c => c.toUpperCase())
}

/**
 * Simple food-gallery style title: "Grilled Chicken with Broccoli"
 */
export function getSimpleGalleryTitle (combo: MealCombo): string {
  const method = cap(combo.cookingMethod)
  const protein = cap(combo.proteinName)
  const vegetable = cap(combo.vegetableName)
  return `${method} ${protein} with ${vegetable}`
}

export type MealDisplayStyle = 'full' | 'simple_gallery'

/**
 * Get a display name for a meal combination.
 * - full: cultural cuisines from CUISINE_RULES (seasonings/garnishes) + dish name
 * - simple_gallery: "Grilled Chicken with Broccoli" style
 */
export function getMealDisplay (combo: MealCombo, options?: { style?: MealDisplayStyle }): MealDisplay {
  const protein = combo.proteinName
  const vegetable = combo.vegetableName
  const subtitle = `${protein} & ${vegetable}`

  if (options?.style === 'simple_gallery') {
    return { title: getSimpleGalleryTitle(combo), subtitle }
  }

  const base = n(combo.baseName)
  const method = n(combo.cookingMethod)
  const matched = DISH_RULES.find(r => matchesRule(combo, r))
  const dishName = matched
    ? matched.dishName
    : `${method.charAt(0).toUpperCase() + method.slice(1)} ${base.charAt(0).toUpperCase() + base.slice(1)}`

  const cuisine = getCuisine(combo)
  const title = cuisine ? `${cuisine} ${dishName}` : dishName

  return { title, subtitle }
}
