import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim()
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
const APPLY = process.env.APPLY === '1' || process.env.APPLY === 'true'
const MAX_UPDATES = Number.isFinite(Number(process.env.MAX_UPDATES))
  ? Math.max(1, Number(process.env.MAX_UPDATES))
  : Infinity

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

function isHttpUrl (value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value.trim())
}

function pickRecipeImageUrls (row) {
  if (!row) return []
  const keys = ['image', 'image_url', 'imageUrl', 'thumbnail', 'thumbnail_url', 'picture', 'photo']
  const urls = []
  for (const key of keys) {
    if (isHttpUrl(row[key])) urls.push(row[key].trim())
  }
  if (Array.isArray(row.image_urls)) {
    for (const value of row.image_urls) {
      if (isHttpUrl(value)) urls.push(value.trim())
    }
  }
  return [...new Set(urls)]
}

async function main () {
  const { data: meals, error: mealErr } = await supabase
    .from('gallery_meals')
    .select('id, title, spoonacular_recipe_id, image_urls')

  if (mealErr || !meals) {
    console.error('Failed to load gallery_meals:', mealErr?.message || 'No rows')
    process.exit(1)
  }

  const { data: details, error: detailErr } = await supabase
    .from('spoonacular_recipe_details')
    .select('*')

  if (detailErr || !details) {
    console.error('Failed to load spoonacular_recipe_details:', detailErr?.message || 'No rows')
    process.exit(1)
  }

  const detailByRecipeId = new Map(details.map((d) => [d.spoonacular_recipe_id, d]))
  const candidates = []

  for (const meal of meals) {
    const hasAttached = Array.isArray(meal.image_urls) && meal.image_urls.some(isHttpUrl)
    if (hasAttached) continue

    const detail = detailByRecipeId.get(meal.spoonacular_recipe_id)
    const urls = pickRecipeImageUrls(detail)
    if (urls.length === 0) continue

    candidates.push({
      id: meal.id,
      title: meal.title,
      spoonacular_recipe_id: meal.spoonacular_recipe_id,
      recipe_title: detail?.title ?? null,
      chosen_url: urls[0]
    })
  }

  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`)
  console.log(`Candidates with missing gallery image_urls + recoverable recipe url: ${candidates.length}`)
  console.log('Sample:')
  console.log(candidates.slice(0, 20))

  if (!APPLY) {
    console.log('\nDry-run only. Set APPLY=1 to write updates.')
    return
  }

  let updated = 0
  for (const c of candidates) {
    if (updated >= MAX_UPDATES) break
    const { error } = await supabase
      .from('gallery_meals')
      .update({ image_urls: [c.chosen_url] })
      .eq('id', c.id)
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

