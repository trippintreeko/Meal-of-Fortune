/**
 * List gallery_meals that share the same title (duplicates after Spoonacular title sync)
 * and meals with no spoonacular_recipe_id (unmatched).
 *
 * Usage: node -r dotenv/config scripts/spoonacular-list-duplicates.mjs
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim()
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function main () {
  const { data: meals, error } = await supabase
    .from('gallery_meals')
    .select('id, title, spoonacular_recipe_id')
    .order('title')

  if (error) {
    console.error('Supabase error:', error.message)
    process.exit(1)
  }

  if (!meals?.length) {
    console.log('No gallery meals.')
    return
  }

  const byTitle = new Map()
  for (const m of meals) {
    const t = (m.title || '').trim() || '(no title)'
    if (!byTitle.has(t)) byTitle.set(t, [])
    byTitle.get(t).push(m)
  }

  const duplicates = [...byTitle.entries()].filter(([, group]) => group.length > 1)
  const unmatched = meals.filter((m) => m.spoonacular_recipe_id == null)

  console.log('--- Duplicate titles (same Spoonacular title, multiple meals) ---')
  if (duplicates.length === 0) {
    console.log('None.')
  } else {
    for (const [title, group] of duplicates) {
      console.log(`  "${title}" (${group.length} meals):`)
      for (const m of group) {
        console.log(`    - ${m.id}  recipe_id=${m.spoonacular_recipe_id ?? 'null'}`)
      }
    }
    console.log(`Total: ${duplicates.length} duplicate title(s), ${duplicates.reduce((s, [, g]) => s + g.length, 0)} meals (${duplicates.reduce((s, [, g]) => s + g.length - 1, 0)} extra to re-match).`)
  }

  console.log('\n--- Unmatched (no spoonacular_recipe_id) ---')
  if (unmatched.length === 0) {
    console.log('None.')
  } else {
    for (const m of unmatched.slice(0, 50)) {
      console.log(`  ${m.id}  "${m.title || ''}"`)
    }
    if (unmatched.length > 50) console.log(`  ... and ${unmatched.length - 50} more`)
    console.log(`Total: ${unmatched.length} unmatched meal(s).`)
  }

  const toRematch = new Set()
  for (const [, group] of duplicates) {
    for (let i = 1; i < group.length; i++) toRematch.add(group[i].id)
  }
  for (const m of unmatched) toRematch.add(m.id)
  console.log(`\nTotal meals to re-match (duplicates + unmatched): ${toRematch.size}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
