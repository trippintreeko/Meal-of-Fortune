import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim()
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

function hasUrl (value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value.trim())
}

function csvEscape (value) {
  const s = String(value ?? '')
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function pickRecipeUrls (row) {
  if (!row) return []
  const keys = ['image', 'image_url', 'imageUrl', 'thumbnail', 'thumbnail_url', 'picture', 'photo']
  const urls = []
  for (const k of keys) {
    if (hasUrl(row[k])) urls.push(row[k].trim())
  }
  if (Array.isArray(row.image_urls)) {
    for (const u of row.image_urls) {
      if (hasUrl(u)) urls.push(u.trim())
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
  const missing = []
  const missingGalleryAttached = []

  for (const meal of meals) {
    const storedUrls = Array.isArray(meal.image_urls) ? meal.image_urls.filter(hasUrl) : []
    const detail = detailByRecipeId.get(meal.spoonacular_recipe_id)
    const recipeUrls = pickRecipeUrls(detail)
    const allUrls = [...new Set([...storedUrls, ...recipeUrls])]

    if (storedUrls.length === 0) {
      missingGalleryAttached.push({
        id: meal.id,
        title: meal.title,
        spoonacular_recipe_id: meal.spoonacular_recipe_id ?? null,
        recipe_title: detail?.title ?? null
      })
    }

    if (allUrls.length === 0) {
      missing.push({
        id: meal.id,
        title: meal.title,
        spoonacular_recipe_id: meal.spoonacular_recipe_id ?? null,
        recipe_title: detail?.title ?? null
      })
    }
  }

  missing.sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')))
  missingGalleryAttached.sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')))

  const outDir = path.join(process.cwd(), 'exports', 'reports')
  fs.mkdirSync(outDir, { recursive: true })

  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const jsonPath = path.join(outDir, `missing-meal-images-${stamp}.json`)
  const csvPath = path.join(outDir, `missing-meal-images-${stamp}.csv`)
  const galleryJsonPath = path.join(outDir, `missing-gallery-attached-images-${stamp}.json`)
  const galleryCsvPath = path.join(outDir, `missing-gallery-attached-images-${stamp}.csv`)

  fs.writeFileSync(jsonPath, JSON.stringify(missing, null, 2))
  fs.writeFileSync(galleryJsonPath, JSON.stringify(missingGalleryAttached, null, 2))

  const columns = ['id', 'title', 'spoonacular_recipe_id', 'recipe_title']
  const csv = [
    columns.join(','),
    ...missing.map((row) => columns.map((c) => csvEscape(row[c])).join(','))
  ].join('\n')
  fs.writeFileSync(csvPath, csv)
  const galleryCsv = [
    columns.join(','),
    ...missingGalleryAttached.map((row) => columns.map((c) => csvEscape(row[c])).join(','))
  ].join('\n')
  fs.writeFileSync(galleryCsvPath, galleryCsv)

  console.log(`Total gallery meals: ${meals.length}`)
  console.log(`Meals with no detected image URL: ${missing.length}`)
  console.log(`Meals with no attached gallery image_urls: ${missingGalleryAttached.length}`)
  console.log(`JSON report: ${jsonPath}`)
  console.log(`CSV report : ${csvPath}`)
  console.log(`Gallery-only JSON report: ${galleryJsonPath}`)
  console.log(`Gallery-only CSV report : ${galleryCsvPath}`)
  console.log('\nFirst 20 missing rows:')
  console.log(missing.slice(0, 20))
  console.log('\nFirst 20 missing gallery-attached rows:')
  console.log(missingGalleryAttached.slice(0, 20))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

