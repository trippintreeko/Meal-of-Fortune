/**
 * Food gallery filter categories: dish shape, meal time (lunch/dinner), and dietary tags.
 * Diet + protein-style shapes use recipe ingredient names (Spoonacular recipe_ingredients), not base/protein/veg UUIDs.
 */

import { DIETS, getExcludedFoodNames, normalizeFoodItemName } from '@/lib/diets'

export type GalleryMealForTags = {
  title?: string
  description?: string
  baseGroup?: string
  mealType?: string
  /** Normalized names from recipe_ingredients for this meal's Spoonacular recipe */
  ingredientNamesNormalized?: string[]
}

/** Shape from recipe ingredients first (so "vegetarian" in title cannot override chicken in the list). */
function shapeFromIngredientBlob (blob: string): string | null {
  const t = blob.toLowerCase()
  if (/\bchicken\b/.test(t)) return 'chicken'
  if (/\b(beef|steak|brisket|ground beef)\b/.test(t)) return 'beef'
  if (/\b(pork|bacon|ham|prosciutto|sausage)\b/.test(t)) return 'pork'
  if (/\b(salmon|shrimp|tuna|cod|tilapia|scallop|crab|lobster|mackerel|trout)\b/.test(t)) return 'seafood'
  if (/\b(hardboiled eggs|hard-boiled eggs|scrambled eggs|egg yolk)\b/.test(t) || /\b(eggs|egg)\b/.test(t)) return 'eggs'
  if (/\b(tofu|tempeh|seitan)\b/.test(t)) return 'plant_based'
  if (/\b(salad|lettuce|spinach|kale|broccoli|arugula|greens|zucchini|cucumber|carrot|celery|tomato|vegetable)\b/.test(t)) {
    return 'vegetables'
  }
  if (/\b(rice|risotto)\b/.test(t)) return 'rice'
  if (/\b(quinoa|couscous|bulgur|barley|oats)\b/.test(t)) return 'grains'
  if (/\b(pasta|spaghetti|linguine|fettuccine|penne|ravioli)\b/.test(t)) return 'pasta'
  if (/\b(noodle|ramen|udon|soba)\b/.test(t)) return 'noodles'
  if (/\b(pizza)\b/.test(t)) return 'pizza'
  if (/\b(soup|stew|broth|bisque|chowder)\b/.test(t)) return 'soup'
  if (/\b(sushi|sashimi|maki)\b/.test(t)) return 'sushi'
  if (/\b(potato|potatoes)\b/.test(t)) return 'potato'
  if (/\b(bread|tortilla|wrap|pita|bagel|bun)\b/.test(t)) return 'bread_wraps'
  if (/\b(lentil|chickpea|black bean|kidney bean|beans)\b/.test(t)) return 'legumes'
  return null
}

/** Dish-shape / ingredient-style primary category (one per meal). */
export function getGalleryShapeCategory (meal: GalleryMealForTags): string {
  const g = (meal.baseGroup ?? '').toLowerCase()
  const mt = (meal.mealType ?? '').toLowerCase()
  const text = `${meal.title ?? ''} ${meal.description ?? ''}`.toLowerCase()
  const ing = meal.ingredientNamesNormalized ?? []
  const ingBlob = ing.join(' ')

  if (g === 'dessert') return 'desserts'
  if (mt === 'breakfast' || g === 'breakfast' || g === 'toast') return 'breakfast'

  if (g === 'soup') return 'soup'
  if (g === 'sushi') return 'sushi'
  if (g === 'pizza') return 'pizza'
  if (g === 'rice') return 'rice'
  if (['quinoa', 'corn', 'seed'].includes(g)) return 'grains'
  if (g === 'noodles') return 'noodles'
  if (g === 'pasta') return 'pasta'
  if (g === 'legume') return 'legumes'
  if (['salad', 'plant', 'seaweed'].includes(g)) return 'vegetables'
  if (g === 'potato') return 'potato'
  if (['bread', 'tortilla', 'dough'].includes(g)) return 'bread_wraps'
  if (g === 'fermented') return 'plant_based'

  if (/\b(ice cream|cheesecake|brownie|tiramisu|chocolate cake|churros|baklava|fondue|dessert|cookies?|mousse|pie)\b/.test(text)) {
    return 'desserts'
  }
  if (/\b(pancake|waffle|french toast|omelet|omelette|oatmeal|granola|cereal)\b/.test(text)) return 'breakfast'

  if (ing.length > 0) {
    const fromIng = shapeFromIngredientBlob(ingBlob)
    if (fromIng != null) return fromIng
  }

  if (/\bchicken\b/.test(text)) return 'chicken'
  if (/\b(beef|steak|brisket|ground beef)\b/.test(text)) return 'beef'
  if (/\b(pork|bacon|ham|prosciutto|sausage)\b/.test(text)) return 'pork'
  if (/\b(salmon|shrimp|tuna|cod|tilapia|scallop|crab|lobster|mackerel|trout)\b/.test(text)) return 'seafood'
  if (/\b(hardboiled eggs|hard-boiled eggs|scrambled eggs|egg yolk)\b/.test(text) || /\b(eggs|egg)\b/.test(text)) return 'eggs'
  if (/\b(tofu|tempeh|seitan)\b/.test(text)) return 'plant_based'
  if (/\b(salad|lettuce|spinach|kale|broccoli|arugula|greens|zucchini|cucumber|carrot|celery|tomato|vegetable)\b/.test(text)) {
    return 'vegetables'
  }

  return 'other'
}

const SHAPE_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  desserts: 'Desserts',
  rice: 'Rice',
  grains: 'Grains',
  noodles: 'Noodles & ramen',
  pasta: 'Pasta',
  soup: 'Soup',
  sushi: 'Sushi',
  pizza: 'Pizza',
  vegetables: 'Vegetables & salad',
  chicken: 'Chicken',
  beef: 'Beef',
  pork: 'Pork',
  seafood: 'Seafood',
  eggs: 'Eggs',
  legumes: 'Legumes',
  potato: 'Potato',
  bread_wraps: 'Bread & wraps',
  plant_based: 'Plant-based',
  other: 'Other'
}

function dietLabelsFromDiets (): Record<string, string> {
  const out: Record<string, string> = {}
  for (const d of DIETS) {
    out[d.id] = d.label
  }
  return out
}

/** Display labels for every gallery filter key (shape, meal time, diets). */
export const GALLERY_CATEGORY_LABELS: Record<string, string> = {
  ...SHAPE_LABELS,
  lunch: 'Lunch',
  dinner: 'Dinner',
  ...dietLabelsFromDiets()
}

const SHAPE_ORDER = [
  'breakfast',
  'desserts',
  'rice',
  'grains',
  'noodles',
  'pasta',
  'soup',
  'sushi',
  'pizza',
  'vegetables',
  'chicken',
  'beef',
  'pork',
  'seafood',
  'eggs',
  'legumes',
  'potato',
  'bread_wraps',
  'plant_based',
  'other'
]

/** Sort order for the gallery category dropdown. */
export const GALLERY_CATEGORY_ORDER: string[] = [
  'breakfast',
  'lunch',
  'dinner',
  ...SHAPE_ORDER.filter((k) => k !== 'breakfast'),
  ...DIETS.map((d) => d.id)
]

export function compareGalleryCategoryKeys (a: string, b: string): number {
  const ia = GALLERY_CATEGORY_ORDER.indexOf(a)
  const ib = GALLERY_CATEGORY_ORDER.indexOf(b)
  const sa = ia === -1 ? 999 : ia
  const sb = ib === -1 ? 999 : ib
  if (sa !== sb) return sa - sb
  return (GALLERY_CATEGORY_LABELS[a] ?? a).localeCompare(GALLERY_CATEGORY_LABELS[b] ?? b)
}

function mealFoodConflictsWithDiet (normalizedNames: string[], dietId: string): boolean {
  const excluded = getExcludedFoodNames(dietId)
  if (normalizedNames.length === 0 || excluded.length === 0) return false
  const exact = new Set(excluded)
  const prefixRules = excluded.filter((x) => !x.includes(' '))
  for (const n of normalizedNames) {
    if (!n) continue
    if (exact.has(n)) return true
    for (const prefix of prefixRules) {
      if (n === prefix || n.startsWith(`${prefix} `)) return true
    }
  }
  return false
}

function collectNormalizedIngredientNames (meal: GalleryMealForTags): string[] {
  const raw = meal.ingredientNamesNormalized ?? []
  return raw.map((n) => normalizeFoodItemName(n)).filter(Boolean)
}

/** Title/description keywords — skipped when filled food slots conflict with that diet. */
function appendDietTagsFromText (
  tags: Set<string>,
  text: string,
  normalizedFoods: string[]
): void {
  const t = text.toLowerCase()
  const tryAdd = (dietId: string, re: RegExp) => {
    if (!re.test(t)) return
    if (normalizedFoods.length > 0 && mealFoodConflictsWithDiet(normalizedFoods, dietId)) return
    tags.add(dietId)
  }
  tryAdd('vegan', /\bvegan\b/)
  tryAdd('vegetarian', /\bvegetarian\b/)
  tryAdd('pescatarian', /\bpescatarian\b/)
  tryAdd('gluten-free', /\bgluten[- ]?free\b/)
  tryAdd('dairy-free', /\bdairy[- ]?free\b/)
  tryAdd('nut-free', /\bnut[- ]?free\b/)
  tryAdd('halal', /\bhalal\b/)
  tryAdd('kosher', /\bkosher\b/)
  tryAdd('keto', /\b(keto|ketogenic)\b/)
  tryAdd('paleo', /\bpaleo\b/)
  tryAdd('low-carb', /\blow[- ]carb\b/)
  tryAdd('shellfish-allergy', /\b(shellfish[- ]free|no shellfish|without shellfish)\b/)
}

function appendMealTimeTags (tags: Set<string>, meal: GalleryMealForTags, shape: string): void {
  const mt = (meal.mealType ?? '').toLowerCase()
  const skipLunchDinner =
    shape === 'breakfast' ||
    shape === 'desserts' ||
    mt === 'breakfast'

  if (skipLunchDinner) return

  if (mt === 'lunch') {
    tags.add('lunch')
    return
  }
  if (mt === 'dinner') {
    tags.add('dinner')
    return
  }
  // any, empty, or unknown → show for both lunch and dinner filters
  tags.add('lunch')
  tags.add('dinner')
}

/**
 * All filter tags for a meal (shape + lunch/dinner when relevant + dietary).
 * Diet tags are derived from recipe ingredients only (no ingredients → no diet tags).
 */
export function getGalleryFilterTags (meal: GalleryMealForTags): string[] {
  const tags = new Set<string>()
  const shape = getGalleryShapeCategory(meal)
  tags.add(shape)

  appendMealTimeTags(tags, meal, shape)

  const normalizedFoods = collectNormalizedIngredientNames(meal)
  const textBlob = `${meal.title ?? ''} ${meal.description ?? ''}`

  if (normalizedFoods.length > 0) {
    appendDietTagsFromText(tags, textBlob, normalizedFoods)
    for (const diet of DIETS) {
      if (!mealFoodConflictsWithDiet(normalizedFoods, diet.id)) {
        tags.add(diet.id)
      }
    }
  }

  if (tags.has('vegan')) {
    tags.add('vegetarian')
  }

  return [...tags]
}

export function mealMatchesGalleryCategory (
  meal: GalleryMealForTags,
  categoryKey: string
): boolean {
  return getGalleryFilterTags(meal).includes(categoryKey)
}

/** Whether any normalized recipe ingredient matches a catalog food name (food_items). */
export function ingredientNamesMatchFoodName (
  ingredientNamesNormalized: string[] | undefined,
  foodNameNormalized: string
): boolean {
  if (!foodNameNormalized || !ingredientNamesNormalized?.length) return false
  return ingredientNamesNormalized.some((ing) => {
    if (!ing) return false
    if (ing === foodNameNormalized) return true
    if (ing.includes(foodNameNormalized) || foodNameNormalized.includes(ing)) return true
    return false
  })
}
