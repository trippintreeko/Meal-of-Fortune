/**
 * Audit `gallery_meals` -> `spoonacular_recipe_details` links.
 *
 * Reports:
 * 1) Recipe IDs assigned to multiple gallery meal rows.
 * 2) Title mismatches where gallery title and recipe-detail title differ.
 *
 * Usage:
 *   node -r dotenv/config scripts/audit-gallery-recipe-links.mjs
 *
 * Requires:
 *   EXPO_PUBLIC_SUPABASE_URL (or SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim()
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

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

async function main () {
  const { data: meals, error: mealsErr } = await supabase
    .from('gallery_meals')
    .select('id, title, spoonacular_recipe_id')
    .not('spoonacular_recipe_id', 'is', null)
    .order('title')

  if (mealsErr) {
    console.error('Failed loading gallery_meals:', mealsErr.message)
    process.exit(1)
  }

  const recipeIds = [...new Set((meals || []).map((m) => m.spoonacular_recipe_id).filter(Boolean))]
  const { data: details, error: detailsErr } = await supabase
    .from('spoonacular_recipe_details')
    .select('spoonacular_recipe_id, title')
    .in('spoonacular_recipe_id', recipeIds)

  if (detailsErr) {
    console.error('Failed loading spoonacular_recipe_details:', detailsErr.message)
    process.exit(1)
  }

  const recipeTitleById = new Map()
  for (const row of details || []) {
    recipeTitleById.set(row.spoonacular_recipe_id, row.title || '')
  }

  const byRecipeId = new Map()
  for (const m of meals || []) {
    const rid = m.spoonacular_recipe_id
    if (!byRecipeId.has(rid)) byRecipeId.set(rid, [])
    byRecipeId.get(rid).push(m)
  }

  const duplicateAssignments = [...byRecipeId.entries()]
    .filter(([, rows]) => rows.length > 1)
    .sort((a, b) => b[1].length - a[1].length)

  const mismatches = []
  for (const m of meals || []) {
    const rid = m.spoonacular_recipe_id
    const recipeTitle = recipeTitleById.get(rid) || ''
    if (!recipeTitle) continue
    const mealTitle = m.title || ''
    const same = norm(mealTitle) === norm(recipeTitle)
    if (same) continue
    const overlap = tokenOverlap(mealTitle, recipeTitle)
    mismatches.push({
      id: m.id,
      mealTitle,
      recipeId: rid,
      recipeTitle,
      overlap
    })
  }

  mismatches.sort((a, b) => a.overlap - b.overlap)

  console.log('=== Duplicate recipe assignments (same recipe_id on many meals) ===')
  console.log(`Groups: ${duplicateAssignments.length}`)
  for (const [rid, rows] of duplicateAssignments.slice(0, 40)) {
    const recipeTitle = recipeTitleById.get(rid) || '(missing recipe title)'
    console.log(`\nrecipe_id=${rid}  recipe_title="${recipeTitle}"  meal_count=${rows.length}`)
    for (const row of rows.slice(0, 8)) {
      console.log(`  - ${row.title}  [${row.id}]`)
    }
    if (rows.length > 8) console.log(`  ... +${rows.length - 8} more`)
  }

  console.log('\n=== Title mismatches (gallery title != recipe detail title) ===')
  console.log(`Rows: ${mismatches.length}`)
  for (const r of mismatches.slice(0, 60)) {
    console.log(
      `\n[id=${r.id}] overlap=${r.overlap.toFixed(2)}\n` +
      `  gallery: "${r.mealTitle}"\n` +
      `  recipe : "${r.recipeTitle}"\n` +
      `  recipe_id=${r.recipeId}`
    )
  }

  console.log('\nDone.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

