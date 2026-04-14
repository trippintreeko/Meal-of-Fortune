/**
 * Ingredient grouping for minigame collection logic.
 *
 * Your DB can contain multiple `ingredient_assets` rows that represent the "same"
 * real-world ingredient (e.g. different Spoonacular IDs for almonds).
 *
 * We do NOT merge DB rows. Instead, we group ingredient IDs at runtime by a
 * normalization key derived from `ingredient_assets.name`, then expand the user's
 * collected IDs so scoring + not-today filtering treat all variants as one.
 */

const normalizeFoodNameBase = (name: string): string => {
  return (name ?? '')
    .toLowerCase()
    .trim()
    .replace(/[-–]/g, ' ')
    .replace(/\s+/g, ' ')
}

function singularizeCommonPlurals (s: string): string {
  if (!s) return s

  // If the string ends with "ies" (e.g. berries), use "y".
  const withY = s.replace(/(\b[a-z]+)ies$/i, (_, stem) => `${stem}y`)
  if (withY !== s) return withY

  // Otherwise, try stripping a trailing "s" (almonds -> almond).
  // Avoid stripping for common endings where plural isn't formed by a simple "s".
  if (withY.endsWith('ss') || withY.endsWith('us') || withY.endsWith('is') || withY.endsWith('ous')) return withY
  if (withY.endsWith('s')) return withY.slice(0, -1)
  return withY
}

/**
 * Normalized ingredient name key used for grouping at runtime.
 * Keep it conservative: only apply lightweight corrections + plural singularization.
 */
export function normalizeIngredientNameForGrouping (name: string): string {
  const base = normalizeFoodNameBase(name)
  if (!base) return ''

  // Canonicalize a few ingredient naming variants we see in Spoonacular.
  // (Shareable with diet matching; keep this list small + targeted.)
  const corrected = base
    .replace(/\bchesse\b/g, 'cheese')
    .replace(/\bmayonaise\b/g, 'mayonnaise')
    .replace(/\bmayonnaisse\b/g, 'mayonnaise')
    .replace(/\bvinegarrette\b/g, 'vinaigrette')
    .replace(/\byoghurt\b/g, 'yogurt')
    .replace(/\boysters sauce\b/g, 'oyster sauce')
    .replace(/\bvanilla yoghurt\b/g, 'vanilla yogurt')
    .replace(/\bbalsamic vinaigrette\b/g, 'balsamic')
    .replace(/\bpackage artichoke hearts\b/g, 'artichoke hearts')
    .replace(/\breduced fat mexican blend cheese\b/g, 'mexican cheese')
    .replace(
      /^combine biscuit crumbs and butter together in a mixing bowl\.?\s*press the biscuit crumbs onto the base\.?$/i,
      'biscuit crumbs'
    )
    .trim()

  if (corrected === 'biscuit crumbs') return 'biscuit crumbs'

  // Simple plural folding so "almonds" and "almond" land in the same group.
  return singularizeCommonPlurals(corrected)
}

export type IngredientGroupIndex = {
  idToGroupKey: Map<string, string>
  groupKeyToIds: Map<string, Set<string>>
}

export function buildIngredientGroupIndex (
  rows: Array<{ spoonacular_ingredient_id: number; name: string | null }>
): IngredientGroupIndex {
  const idToGroupKey = new Map<string, string>()
  const groupKeyToIds = new Map<string, Set<string>>()

  for (const row of rows) {
    const idStr = String(row.spoonacular_ingredient_id)
    const key = normalizeIngredientNameForGrouping(row.name ?? '') || `id:${idStr}`
    idToGroupKey.set(idStr, key)

    if (!groupKeyToIds.has(key)) groupKeyToIds.set(key, new Set())
    groupKeyToIds.get(key)!.add(idStr)
  }

  return { idToGroupKey, groupKeyToIds }
}

export function expandIdsByIngredientGroups (
  ids: string[],
  index: IngredientGroupIndex
): string[] {
  const expanded = new Set<string>()

  for (const id of ids) {
    const groupKey = index.idToGroupKey.get(id) ?? `id:${id}`
    const members = index.groupKeyToIds.get(groupKey)
    if (!members || members.size === 0) expanded.add(id)
    else members.forEach((m) => expanded.add(m))
  }

  return [...expanded]
}

