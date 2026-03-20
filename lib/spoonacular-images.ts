/**
 * Spoonacular CDN recipe images often include a size suffix like `-312x231.jpg`.
 * Use a larger variant for fullscreen / sharing when possible.
 * @see https://spoonacular.com/food-api/docs#Show-Images
 */

const SPOONACULAR_RECIPES_HOST = 'img.spoonacular.com/recipes'

/** @see https://spoonacular.com/food-api/docs#Show-Images — ingredients: 500x500, 250x250, 100x100 */
const INGREDIENT_SIZE_RE = /\/ingredients_(100x100|250x250)\//i

export function getBestRecipeImageUrlForViewing (url: string | null | undefined): string | undefined {
  if (url == null || typeof url !== 'string') return undefined
  const u = url.trim()
  if (!u) return undefined
  if (!u.includes(SPOONACULAR_RECIPES_HOST)) return u
  const upgraded = u.replace(/-\d+x\d+(\.(?:jpg|jpeg|png|webp))$/i, '-636x393$1')
  return upgraded || u
}

/**
 * Spoonacular recipe `image_url` is often already copied into `gallery_meals.image_urls`
 * by import scripts. Prepend recipe URL + concat gallery would duplicate the same link.
 * Merge with order: recipe first (when present), then stored URLs; drop exact duplicates.
 */
export function mergeRecipeAndStoredImageUrls (
  recipeImageUrl: string | null | undefined,
  storedUrls: string[]
): string[] {
  const ordered: string[] = []
  const push = (u: string | null | undefined) => {
    const s = u?.trim() ?? ''
    if (s) ordered.push(s)
  }
  push(recipeImageUrl)
  for (const u of storedUrls) push(u)
  const seen = new Set<string>()
  const out: string[] = []
  for (const s of ordered) {
    if (seen.has(s)) continue
    seen.add(s)
    out.push(s)
  }
  return out
}

/**
 * Use largest Spoonacular ingredient CDN size (500×500) for fullscreen / sharing.
 * Non–Spoonacular URLs (e.g. Supabase Storage) are returned unchanged.
 */
export function getBestIngredientImageUrlForViewing (url: string | null | undefined): string | undefined {
  if (url == null || typeof url !== 'string') return undefined
  const u = url.trim()
  if (!u) return undefined
  if (!u.includes('img.spoonacular.com/ingredients_')) return u
  const upgraded = u.replace(INGREDIENT_SIZE_RE, '/ingredients_500x500/')
  return upgraded || u
}
