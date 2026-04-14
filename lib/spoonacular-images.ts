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
 * When parseable, returns Spoonacular recipe id embedded in CDN or Supabase recipe-images path.
 */
export function extractSpoonacularRecipeIdFromImageUrl (url: string | null | undefined): number | null {
  if (url == null || typeof url !== 'string') return null
  const t = url.trim()
  if (!t) return null
  try {
    const u = new URL(t)
    const path = u.pathname
    const storage = path.match(/\/recipe-images\/(\d+)\.(?:jpg|jpeg|png|webp)$/i)
    if (storage) return parseInt(storage[1], 10)
    const cdn = path.match(/\/recipes\/(\d+)(?:-\d+x\d+)?\.(?:jpg|jpeg|png|webp)$/i)
    if (cdn) return parseInt(cdn[1], 10)
  } catch {
    /* ignore */
  }
  return null
}

/** Same physical image as different URL strings (CDN size vs Supabase upload, etc.). */
export function canonicalRecipeImageIdentityKey (url: string): string {
  const rid = extractSpoonacularRecipeIdFromImageUrl(url)
  if (rid != null) return `spRecipeImg:${rid}`
  try {
    const u = new URL(url.trim())
    const path = u.pathname.replace(/-\d+x\d+(\.(?:jpg|jpeg|png|webp))$/i, '$1')
    return `path:${u.hostname.toLowerCase()}${path}`
  } catch {
    return `raw:${url.trim().toLowerCase()}`
  }
}

/**
 * Spoonacular recipe `image_url` is often already copied into `gallery_meals.image_urls`
 * by import scripts. Prepend recipe URL + concat gallery would duplicate the same link.
 * Merge: recipe first, then stored URLs that still belong to this Spoonacular recipe (when id known),
 * then dedupe by canonical identity (CDN size variants, Supabase vs CDN same id).
 */
export function mergeRecipeAndStoredImageUrls (
  recipeImageUrl: string | null | undefined,
  storedUrls: string[],
  spoonacularRecipeId?: number | null
): string[] {
  const ordered: string[] = []
  const push = (u: string | null | undefined) => {
    const s = u?.trim() ?? ''
    if (s) ordered.push(s)
  }
  push(recipeImageUrl)
  const rid =
    spoonacularRecipeId != null && Number.isFinite(Number(spoonacularRecipeId))
      ? Number(spoonacularRecipeId)
      : null
  for (const u of storedUrls) {
    if (rid != null) {
      const fromUrl = extractSpoonacularRecipeIdFromImageUrl(u)
      if (fromUrl != null && fromUrl !== rid) continue
    }
    push(u)
  }
  const seen = new Set<string>()
  const out: string[] = []
  for (const s of ordered) {
    const key = canonicalRecipeImageIdentityKey(s)
    if (seen.has(key)) continue
    seen.add(key)
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
