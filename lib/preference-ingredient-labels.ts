/**
 * Food Preferences UI: normalize `ingredient_assets.name` for grouping chips and
 * optional display overrides when Spoonacular stores recipe-style text instead of a label.
 */

/** After {@link normalizeIngredientName}, map normalized key → chip/list display string. */
const DISPLAY_LABEL_BY_NORMALIZED_KEY: Record<string, string> = {
  'biscuit crumbs': 'Biscuit crumbs'
}

/**
 * Canonical key for grouping chips (same as previous inline helper in preferences).
 */
export function normalizeIngredientName (name: string): string {
  const base = (name ?? '')
    .toLowerCase()
    .trim()
    .replace(/[-–]/g, ' ')
    .replace(/\s+/g, ' ')
  if (!base) return ''

  const corrected = base
    .replace(/\bchesse\b/g, 'cheese')
    .replace(/\bmayonaise\b/g, 'mayonnaise')
    .replace(/\bmayonnaisse\b/g, 'mayonnaise')
    .replace(/\bvinegarrette\b/g, 'vinaigrette')
    .replace(/\byoghurt\b/g, 'yogurt')
    .replace(/\boysters sauce\b/g, 'oyster sauce')
    .replace(/^celery stalks?$/g, 'celery')
    .replace(/^package\s+artichoke hearts$/g, 'artichoke hearts')
    .replace(/^reduced fat mexican blend cheese$/g, 'mexican cheese')
    .replace(
      /^combine biscuit crumbs and butter together in a mixing bowl\.?\s*press the biscuit crumbs onto the base\.?$/i,
      'biscuit crumbs'
    )

  const cheeseMatch = corrected.match(/^(.+?) cheese$/)
  if (cheeseMatch) {
    const head = (cheeseMatch[1] ?? '').trim()
    if (head && !head.includes(' ')) return head
  }

  return corrected
}

/**
 * Label for chips and full preference lists: uses override when normalized key matches.
 */
export function preferenceIngredientLabel (rawName: string): string {
  const key = normalizeIngredientName(rawName)
  if (DISPLAY_LABEL_BY_NORMALIZED_KEY[key]) return DISPLAY_LABEL_BY_NORMALIZED_KEY[key]
  return rawName
}
