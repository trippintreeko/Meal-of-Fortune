/**
 * Safe fixer for gallery_meals -> spoonacular_recipe_id mismatches.
 *
 * Safety principles:
 * - Dry-run by default (no DB writes unless APPLY=1 or APPLY=true).
 * - Only proposes changes when there is a very high-confidence exact normalized
 *   title match in spoonacular_recipe_details.
 * - Optional targeted mode for explicit meal IDs / titles.
 *
 * Usage examples:
 *   # Dry-run all high-confidence fixes
 *   node -r dotenv/config scripts/fix-gallery-recipe-links-safe.mjs
 *
 *   # Apply all high-confidence fixes
 *   APPLY=1 node -r dotenv/config scripts/fix-gallery-recipe-links-safe.mjs
 *
 *   # Targeted dry-run by titles
 *   TARGET_TITLES="Cilantro Tofu Bean Burgers|Brown Rice Vegetable Pulao" node -r dotenv/config scripts/fix-gallery-recipe-links-safe.mjs
 *
 *   # Targeted apply by IDs
 *   APPLY=1 TARGET_IDS="f06a86b9-d7eb-4681-af47-f5c1c4eb0da8,298178f8-a67f-4b0d-b9cf-a852477e1791" node -r dotenv/config scripts/fix-gallery-recipe-links-safe.mjs
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim()
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
const APPLY = process.env.APPLY === '1' || process.env.APPLY === 'true'
const TARGET_IDS = (process.env.TARGET_IDS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
const TARGET_TITLES = (process.env.TARGET_TITLES || '')
  .split('|')
  .map((s) => s.trim())
  .filter(Boolean)
const MAX_UPDATES = Number.isFinite(Number(process.env.MAX_UPDATES))
  ? Math.max(1, Number(process.env.MAX_UPDATES))
  : Infinity

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

function norm (s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[-–]/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
}

function tokenOverlap (a, b) {
  const as = new Set(norm(a).split(' ').filter(Boolean))
  const bs = new Set(norm(b).split(' ').filter(Boolean))
  if (as.size === 0 || bs.size === 0) return 0
  let common = 0
  for (const t of as) if (bs.has(t)) common++
  return common / Math.max(as.size, bs.size)
}

function shouldIncludeTarget (row) {
  const hasTargets = TARGET_IDS.length > 0 || TARGET_TITLES.length > 0
  if (!hasTargets) return true
  if (TARGET_IDS.includes(row.id)) return true
  return TARGET_TITLES.some((t) => norm(t) === norm(row.title))
}

async function main () {
  const { data: meals, error: mealsErr } = await supabase
    .from('gallery_meals')
    .select('id, title, spoonacular_recipe_id')
    .order('title')

  if (mealsErr || !meals) {
    console.error('Failed to load gallery_meals:', mealsErr?.message || 'No rows')
    process.exit(1)
  }

  const { data: details, error: detailErr } = await supabase
    .from('spoonacular_recipe_details')
    .select('spoonacular_recipe_id, title')

  if (detailErr || !details) {
    console.error('Failed to load spoonacular_recipe_details:', detailErr?.message || 'No rows')
    process.exit(1)
  }

  const recipeTitleById = new Map()
  const detailRowsByNormTitle = new Map()
  for (const d of details) {
    recipeTitleById.set(d.spoonacular_recipe_id, d.title || '')
    const k = norm(d.title)
    if (!k) continue
    if (!detailRowsByNormTitle.has(k)) detailRowsByNormTitle.set(k, [])
    detailRowsByNormTitle.get(k).push(d)
  }

  const candidates = []
  for (const m of meals) {
    if (!shouldIncludeTarget(m)) continue

    const mealNorm = norm(m.title)
    if (!mealNorm) continue
    const possible = detailRowsByNormTitle.get(mealNorm) || []

    // High confidence rule: exactly one recipe detail row matches normalized title.
    if (possible.length !== 1) continue
    const target = possible[0]
    const targetRecipeId = target.spoonacular_recipe_id

    if (m.spoonacular_recipe_id === targetRecipeId) continue

    const currentRecipeTitle = recipeTitleById.get(m.spoonacular_recipe_id) || ''
    const currentOverlap = tokenOverlap(m.title, currentRecipeTitle)
    const targetOverlap = tokenOverlap(m.title, target.title)

    // Require clear mismatch now + strong target alignment.
    if (targetOverlap < 0.95) continue
    if (currentOverlap > 0.5) continue

    candidates.push({
      id: m.id,
      title: m.title,
      fromRecipeId: m.spoonacular_recipe_id,
      fromRecipeTitle: currentRecipeTitle,
      toRecipeId: targetRecipeId,
      toRecipeTitle: target.title,
      currentOverlap,
      targetOverlap
    })
  }

  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`)
  console.log(`Targets: ids=${TARGET_IDS.length} titles=${TARGET_TITLES.length}`)
  console.log(`High-confidence candidates: ${candidates.length}`)

  for (const c of candidates.slice(0, 120)) {
    console.log(
      `\n[${c.id}] "${c.title}"\n` +
      `  from: recipe_id=${c.fromRecipeId ?? 'null'} "${c.fromRecipeTitle}" (overlap=${c.currentOverlap.toFixed(2)})\n` +
      `  to  : recipe_id=${c.toRecipeId} "${c.toRecipeTitle}" (overlap=${c.targetOverlap.toFixed(2)})`
    )
  }
  if (candidates.length > 120) console.log(`\n... ${candidates.length - 120} more`)

  if (!APPLY) {
    console.log('\nDry-run only. Set APPLY=1 to write updates.')
    return
  }

  let updated = 0
  for (const c of candidates) {
    if (updated >= MAX_UPDATES) break
    const { error } = await supabase
      .from('gallery_meals')
      .update({ spoonacular_recipe_id: c.toRecipeId })
      .eq('id', c.id)
      .eq('spoonacular_recipe_id', c.fromRecipeId)
    if (error) {
      console.warn(`Update failed for ${c.id}: ${error.message}`)
      continue
    }
    updated++
  }

  console.log(`\nApplied updates: ${updated}/${Math.min(candidates.length, MAX_UPDATES)}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

