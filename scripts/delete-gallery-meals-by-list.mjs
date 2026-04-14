import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim()
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
const APPLY = process.env.APPLY === '1' || process.env.APPLY === 'true'

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const targets = [
  'Slow Cooker Chicken Verde Enchilada',
  "BEginner's Quinoa Cakes",
  'Portobello Baked Eggs',
  'Venison Meatloaf with Blackberry Bbq Sauce and Buffalo Sweet Potato/ pumpkin Hash',
  'Vegetarian Burgers',
  'Meatball Vegetable Soup',
  'Shrimp, Bacon, Avocado Pasta Salad',
  'Stuffed Shells with Beef and Broc',
  'Spinach Kugel',
  'Cauliflower Chickpea Stew',
  'Chicken Piri Piri with Spicy Rice',
  'Kale Rolls',
  'Paella for Four; a Wonderful Spanish Mixed Seafood Stew',
  'Gazpacho with Avocado Cream',
  'Quinoa and Chickpea Salad with Sun-Dried Tomatoes and Dried Cherries',
  'Turkish Baharat Meatballs with Lentil Pilaf'
]

function norm (value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[\u2018\u2019]/g, '\'')
    .replace(/\s+/g, ' ')
}

const targetNorm = new Set(targets.map(norm))

async function main () {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data, error } = await supabase
    .from('gallery_meals')
    .select('id, title, spoonacular_recipe_id')

  if (error || !data) {
    console.error('Failed to load gallery_meals:', error?.message || 'No rows')
    process.exit(1)
  }

  const matches = data.filter((row) => {
    const t = norm(row.title)
    if (targetNorm.has(t)) return true
    // Common variation for this title
    if (t === 'beginners quinoa cakes' && targetNorm.has(norm("BEginner's Quinoa Cakes"))) return true
    return false
  })

  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`)
  console.log(`Matched rows: ${matches.length}`)
  console.log(`Vegetarian Burgers rows matched: ${matches.filter((m) => norm(m.title) === 'vegetarian burgers').length}`)
  console.log(JSON.stringify(matches, null, 2))

  if (!APPLY) {
    console.log('\nDry-run only. Set APPLY=1 to delete these rows.')
    return
  }

  if (matches.length === 0) {
    console.log('\nNo rows matched. Nothing deleted.')
    return
  }

  const ids = matches.map((m) => m.id)
  const { error: delError } = await supabase
    .from('gallery_meals')
    .delete()
    .in('id', ids)

  if (delError) {
    console.error('Delete failed:', delError.message)
    process.exit(1)
  }

  const { count } = await supabase
    .from('gallery_meals')
    .select('id', { count: 'exact', head: true })
    .in('id', ids)

  console.log(`\nDeleted rows: ${ids.length}`)
  console.log(`Still present after delete: ${count ?? 'unknown'}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

