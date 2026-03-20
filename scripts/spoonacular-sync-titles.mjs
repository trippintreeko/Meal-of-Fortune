/**
 * Update gallery_meals.title from Spoonacular recipe titles (spoonacular_recipe_details.title).
 * Use after spoonacular-match-and-save has populated recipe details.
 *
 * Usage: node -r dotenv/config scripts/spoonacular-sync-titles.mjs
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
  const { data: details, error: detailsError } = await supabase
    .from('spoonacular_recipe_details')
    .select('spoonacular_recipe_id, title')
    .not('title', 'is', null)

  if (detailsError) {
    console.error('Failed to load recipe details:', detailsError.message)
    process.exit(1)
  }

  const byId = new Map((details || []).map((r) => [r.spoonacular_recipe_id, r.title]))

  const { data: meals, error: mealsError } = await supabase
    .from('gallery_meals')
    .select('id, spoonacular_recipe_id')
    .not('spoonacular_recipe_id', 'is', null)

  if (mealsError) {
    console.error('Failed to load gallery meals:', mealsError.message)
    process.exit(1)
  }

  let updated = 0
  for (const meal of meals || []) {
    const newTitle = byId.get(meal.spoonacular_recipe_id)
    if (!newTitle || typeof newTitle !== 'string' || !newTitle.trim()) continue
    const { error } = await supabase
      .from('gallery_meals')
      .update({ title: newTitle.trim() })
      .eq('id', meal.id)
    if (!error) updated++
  }

  console.log(`Updated ${updated} gallery meal title(s) from Spoonacular.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
