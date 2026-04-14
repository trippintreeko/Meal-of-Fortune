/**
 * Deletes gallery_meals + spoonacular_recipe_details for given Spoonacular ids.
 * Leaves recipe_ingredients intact (shared across meals / reuse).
 * Requires SUPABASE_SERVICE_ROLE_KEY and EXPO_PUBLIC_SUPABASE_URL in .env
 *
 *   node -r dotenv/config scripts/remove-spoonacular-recipes.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../.env') })

const IDS = [
  984198, 715393, 715742, 679539, 780000, 803366, 982372, 13265,
  868800, 681713, 949421, 715412, 715596, 715748, 716429, 716427,
  716363, 13073, 769775, 685023, 715732, 681708, 715754, 795512
]

async function main () {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) {
    console.error('Set EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env')
    process.exit(1)
  }
  const supabase = createClient(url, key)

  const { error: e1 } = await supabase.from('gallery_meals').delete().in('spoonacular_recipe_id', IDS)
  if (e1) {
    console.error('gallery_meals delete:', e1.message)
    process.exit(1)
  }
  console.log('Deleted gallery_meals rows')

  const { error: e2 } = await supabase.from('spoonacular_recipe_details').delete().in('spoonacular_recipe_id', IDS)
  if (e2) {
    console.error('spoonacular_recipe_details delete:', e2.message)
    process.exit(1)
  }
  console.log('Deleted spoonacular_recipe_details rows')
  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
