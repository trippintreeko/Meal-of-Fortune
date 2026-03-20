/**
 * List gallery meals that have a Spoonacular recipe match (from DB).
 * Use after running spoonacular-match-and-save (even if it hit the 402 limit).
 *
 * Usage: node -r dotenv/config scripts/spoonacular-list-matches.mjs
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
  const { data: rows, error } = await supabase
    .from('gallery_meals')
    .select('id, title, spoonacular_recipe_id')
    .not('spoonacular_recipe_id', 'is', null)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Supabase error:', error.message)
    process.exit(1)
  }

  if (!rows?.length) {
    console.log('No gallery meals with a Spoonacular recipe match yet.')
    return
  }

  console.log(`\n${rows.length} meal(s) with a recipe match:\n`)
  console.log('Meal title                              | Spoonacular recipe ID')
  console.log('----------------------------------------|----------------------')
  for (const r of rows) {
    const title = (r.title || '').slice(0, 38).padEnd(38)
    console.log(`${title} | ${r.spoonacular_recipe_id}`)
  }
  const uniqueIds = [...new Set(rows.map((r) => r.spoonacular_recipe_id))]
  console.log(`\nUnique recipe IDs: ${uniqueIds.length}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
