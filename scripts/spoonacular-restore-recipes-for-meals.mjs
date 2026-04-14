/**
 * Re-fetch Spoonacular recipe details + ingredients for specific gallery_meals (by row id),
 * and optionally re-assign spoonacular_recipe_id using title search.
 *
 * Use when match-and-save stopped mid-run (402), or you need instructions/ingredients rewritten
 * for certain meals only — without re-running a full 500-meal match.
 *
 * Requires: EXPO_PUBLIC_SUPABASE_URL (or SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY, SPOONACULAR_API_KEY
 *
 * Examples (macOS/Linux bash):
 *   GALLERY_MEAL_IDS=uuid1,uuid2 node -r dotenv/config scripts/spoonacular-restore-recipes-for-meals.mjs
 *
 * Windows PowerShell (comma-separated ids, no bash-style VAR=value prefix):
 *   $env:GALLERY_MEAL_IDS='uuid1,uuid2'; npm run spoonacular-restore-meals
 *
 * File (create scripts/my-restore-list.txt — one UUID per line):
 *   npm run spoonacular-restore-meals -- --file=scripts/my-restore-list.txt
 *   npm run spoonacular-restore-meals -- --ids=uuid1,uuid2
 *
 * Refetch only (default): uses each meal's current spoonacular_recipe_id, upserts details + ingredients.
 *
 * Rematch by title (new Spoonacular id from search):
 *   ... --rematch-title
 *   ... --rematch-title --rematch-index=1   (2nd search result — less collision than #0)
 *
 * Export ids for restore (writes scripts/my-restore-list.txt; safe # header, UUID lines only):
 *   npm run spoonacular-restore-meals -- --print-ids
 *   npm run spoonacular-restore-meals -- --write-restore-list   (file only, no table)
 *   npm run spoonacular-restore-meals -- --file=scripts/my-restore-list.txt
 */

import { readFileSync, writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim()
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY?.trim()

const SPOONACULAR_BASE = 'https://api.spoonacular.com'
const INGREDIENT_IMAGE_BASE = 'https://img.spoonacular.com/ingredients_100x100'
const BULK_BATCH_SIZE = 50
/** PostgREST `.in('id', …)` is sent on the URL; hundreds of UUIDs exceed safe URL length → fetch fails. */
const GALLERY_MEAL_IN_BATCH = 80
const INGREDIENT_THROTTLE_MS = 100

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SPOONACULAR_API_KEY) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL/SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or SPOONACULAR_API_KEY.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

function sleep (ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** First UUID on a line, or null (comments / prose / --print-ids paste with tabs). */
function extractGalleryMealId (raw) {
  let t = String(raw || '').replace(/^\uFEFF/, '').replace(/\r/g, '').trim()
  if (!t) return null
  if (t.startsWith('#')) return null
  t = t.split('#')[0].trim()
  if (!t) return null
  const m = t.match(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i)
  return m ? m[0].toLowerCase() : null
}

function parseArgs () {
  const out = {
    mealIds: [],
    file: null,
    rematchTitle: false,
    rematchIndex: 0,
    printIds: false,
    /** If set, path to write one gallery_meals.id per line (default scripts/my-restore-list.txt). */
    writeRestoreListPath: null,
    /** With --print-ids, skip writing the restore file (default is to write). */
    noWriteRestoreList: false,
    dryRun: false
  }
  for (const a of process.argv.slice(2)) {
    if (a.startsWith('--file=')) out.file = a.slice(7).trim()
    else if (a.startsWith('--ids=')) {
      out.mealIds.push(...a.slice(6).split(',').map((s) => s.trim()).filter(Boolean))
    } else if (a.startsWith('--rematch-index=')) {
      out.rematchIndex = Math.max(0, parseInt(a.slice('--rematch-index='.length), 10) || 0)
    } else if (a === '--rematch-title') out.rematchTitle = true
    else if (a === '--print-ids') out.printIds = true
    else if (a === '--write-restore-list') out.writeRestoreListPath = 'scripts/my-restore-list.txt'
    else if (a.startsWith('--write-restore-list=')) {
      const p = a.slice('--write-restore-list='.length).trim()
      out.writeRestoreListPath = p || 'scripts/my-restore-list.txt'
    }
    else if (a === '--no-write-restore-list') out.noWriteRestoreList = true
    else if (a === '--dry-run') out.dryRun = true
    else if (a === '--help' || a === '-h') {
      console.log(`
Usage:
  node -r dotenv/config scripts/spoonacular-restore-recipes-for-meals.mjs [options]

Options:
  --file=path.txt     One UUID per line; # comments; or paste --print-ids rows (uuid picked out)
  --ids=id1,id2       Comma-separated gallery_meals.id values
  --rematch-title     Search Spoonacular by meal title and set spoonacular_recipe_id before fetch
  --rematch-index=N   Use Nth search result (0=first, default 0)
  --print-ids         Print table; also writes scripts/my-restore-list.txt (UUIDs only + # header)
  --no-write-restore-list   With --print-ids: do not write the file
  --write-restore-list[=path]  Write ids only (no table); or override file path with --print-ids
  --dry-run           Show what would run; no API/DB writes

Env:
  GALLERY_MEAL_IDS    Comma-separated UUIDs (same as --ids)

Windows PowerShell:
  $env:GALLERY_MEAL_IDS='uuid1,uuid2'; npm run spoonacular-restore-meals
`)
      process.exit(0)
    }
  }
  const envIds = (process.env.GALLERY_MEAL_IDS || '').split(',').map((s) => s.trim()).filter(Boolean)
  out.mealIds.push(...envIds)
  if (out.file) {
    try {
      const text = readFileSync(out.file, 'utf8')
      for (const line of text.split(/\n/)) {
        const id = extractGalleryMealId(line)
        if (id) out.mealIds.push(id)
      }
    } catch (e) {
      console.error('Could not read --file:', e.message)
      process.exit(1)
    }
  }
  const seen = new Set()
  const deduped = []
  for (const raw of out.mealIds) {
    const id = extractGalleryMealId(raw)
    if (id) {
      if (!seen.has(id)) {
        seen.add(id)
        deduped.push(id)
      }
      continue
    }
    const t = String(raw || '').replace(/^\uFEFF/, '').trim()
    if (t && !t.startsWith('#')) console.warn('Skipping (not a UUID):', t.slice(0, 72))
  }
  out.mealIds = deduped
  if (out.printIds && !out.noWriteRestoreList && out.writeRestoreListPath === null) {
    out.writeRestoreListPath = 'scripts/my-restore-list.txt'
  }
  return out
}

async function getRecipeInformationBulk (ids) {
  if (ids.length === 0) return []
  const url = new URL(`${SPOONACULAR_BASE}/recipes/informationBulk`)
  url.searchParams.set('apiKey', SPOONACULAR_API_KEY)
  url.searchParams.set('ids', ids.join(','))
  const res = await fetch(url.toString())
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Spoonacular bulk ${res.status}: ${text.slice(0, 200)}`)
  }
  const data = await res.json()
  return Array.isArray(data) ? data : [data]
}

async function searchRecipeIdsByTitle (query, number = 15) {
  const url = new URL(`${SPOONACULAR_BASE}/recipes/search`)
  url.searchParams.set('apiKey', SPOONACULAR_API_KEY)
  url.searchParams.set('query', (query || '').trim() || 'recipe')
  url.searchParams.set('number', String(Math.min(Math.max(number, 1), 50)))
  const res = await fetch(url.toString())
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Spoonacular search ${res.status}: ${text.slice(0, 200)}`)
  }
  const data = await res.json()
  const results = data.results || []
  return results.map((r) => r.id).filter((id) => id != null)
}

function getInstructionsText (recipe) {
  const steps = recipe.analyzedInstructions?.[0]?.steps
  const fromAnalyzed =
    Array.isArray(steps) && steps.length > 0
      ? steps.map((s, i) => `${i + 1}. ${String(s.step || '').trim()}`).filter(Boolean).join('\n\n')
      : null
  const instr = recipe.instructions && String(recipe.instructions).trim()
    ? String(recipe.instructions).trim()
    : null
  if (!fromAnalyzed) return instr
  if (!instr) return fromAnalyzed
  const analyzedBlocks = fromAnalyzed.split(/\n\n/).filter(Boolean).length
  const liCount = (instr.match(/<li[\s>]/gi) || []).length
  if (analyzedBlocks >= 2 && liCount < 2) return fromAnalyzed
  return instr
}

async function downloadAndUploadIngredientImage (ingredientId, imageFilename) {
  if (!imageFilename || !String(imageFilename).trim()) return null
  const spoonacularUrl = `${INGREDIENT_IMAGE_BASE}/${imageFilename.trim()}`
  const ext = imageFilename.includes('.') ? imageFilename.split('.').pop() : 'jpg'
  const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
  const storagePath = `${ingredientId}.${ext}`
  try {
    const imgRes = await fetch(spoonacularUrl)
    if (!imgRes.ok) return null
    const buf = await imgRes.arrayBuffer()
    const { error } = await supabase.storage.from('ingredient-images').upload(storagePath, buf, { contentType, upsert: true })
    if (error) return null
    const { data: urlData } = supabase.storage.from('ingredient-images').getPublicUrl(storagePath)
    return urlData?.publicUrl ?? null
  } catch {
    return null
  }
}

async function downloadAndUploadRecipeImage (recipeId, imageUrlOrPath) {
  if (!imageUrlOrPath || !String(imageUrlOrPath).trim()) return null
  let spoonacularUrl = imageUrlOrPath
  if (!spoonacularUrl.startsWith('http')) {
    spoonacularUrl = `https://img.spoonacular.com/recipes/${spoonacularUrl}`
  }
  const ext = spoonacularUrl.includes('.webp') ? 'webp' : spoonacularUrl.includes('.png') ? 'png' : 'jpg'
  const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
  const storagePath = `${recipeId}.${ext}`
  try {
    const imgRes = await fetch(spoonacularUrl)
    if (!imgRes.ok) return null
    const buf = await imgRes.arrayBuffer()
    const { error } = await supabase.storage.from('recipe-images').upload(storagePath, buf, { contentType, upsert: true })
    if (error) return null
    const { data: urlData } = supabase.storage.from('recipe-images').getPublicUrl(storagePath)
    return urlData?.publicUrl ?? null
  } catch {
    return null
  }
}

async function saveRecipesFromPayloads (allRecipes, { skipIngredientImages = false } = {}) {
  for (const recipe of allRecipes) {
    const rid = recipe.id
    if (rid == null) continue
    const title = (recipe.title || '').trim() || null
    const instructions = getInstructionsText(recipe)
    const servings = recipe.servings != null ? parseInt(recipe.servings, 10) : null
    const readyInMinutes = recipe.readyInMinutes != null ? parseInt(recipe.readyInMinutes, 10) : null
    let imageUrl = null
    if (recipe.image) {
      imageUrl = await downloadAndUploadRecipeImage(rid, recipe.image)
      if (!imageUrl) imageUrl = recipe.image.startsWith('http') ? recipe.image : `https://img.spoonacular.com/recipes/${recipe.image}`
    }
    const cuisine = Array.isArray(recipe.cuisines) && recipe.cuisines.length > 0
      ? (recipe.cuisines[0] || '').trim() || null
      : null
    const { error: detailErr } = await supabase.from('spoonacular_recipe_details').upsert(
      {
        spoonacular_recipe_id: rid,
        title,
        instructions,
        servings,
        ready_in_minutes: readyInMinutes,
        image_url: imageUrl,
        cuisine,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'spoonacular_recipe_id' }
    )
    if (detailErr) {
      console.warn(`  Recipe ${rid} details: ${detailErr.message}`)
      continue
    }
    await supabase.from('recipe_ingredients').delete().eq('spoonacular_recipe_id', rid)
    const ingredients = recipe.extendedIngredients || []
    if (ingredients.length > 0) {
      const rows = ingredients.map((ing, idx) => ({
        spoonacular_recipe_id: rid,
        spoonacular_ingredient_id: ing.id ?? null,
        name: (ing.name || ing.original || '').trim() || 'Ingredient',
        amount: ing.amount != null ? parseFloat(ing.amount) : null,
        unit: (ing.unit || '').trim() || null,
        sort_order: idx
      }))
      const { error: ingErr } = await supabase.from('recipe_ingredients').insert(rows)
      if (ingErr) console.warn(`  Recipe ${rid} ingredients: ${ingErr.message}`)
    }
    await sleep(50)
  }

  if (skipIngredientImages) return

  const ingredientsSeen = new Set()
  const toUpsert = []
  for (const recipe of allRecipes) {
    const ingredients = recipe.extendedIngredients || []
    for (const ing of ingredients) {
      const id = ing.id
      const image = ing.image
      const name = (ing.name || ing.original || '').trim() || null
      if (id == null || !image) continue
      if (ingredientsSeen.has(id)) continue
      ingredientsSeen.add(id)
      const imageUrlIng = await downloadAndUploadIngredientImage(id, image)
      if (imageUrlIng) {
        toUpsert.push({ spoonacular_ingredient_id: id, name, image_url: imageUrlIng })
      }
      await sleep(INGREDIENT_THROTTLE_MS)
    }
  }
  if (toUpsert.length > 0) {
    const UPSERT_BATCH = 100
    for (let i = 0; i < toUpsert.length; i += UPSERT_BATCH) {
      const batch = toUpsert.slice(i, i + UPSERT_BATCH)
      const { error: upsertError } = await supabase
        .from('ingredient_assets')
        .upsert(batch, { onConflict: 'spoonacular_ingredient_id', ignoreDuplicates: false })
      if (upsertError) console.error('ingredient_assets upsert error:', upsertError.message)
    }
    console.log(`Upserted ${toUpsert.length} ingredient asset rows.`)
  }
}

async function main () {
  const args = parseArgs()

  if (args.printIds || args.writeRestoreListPath) {
    const { data, error } = await supabase
      .from('gallery_meals')
      .select('id, title, spoonacular_recipe_id')
      .order('sort_order', { ascending: true })
    if (error) {
      console.error(error.message)
      process.exit(1)
    }
    const rows = data || []
    if (args.printIds) {
      console.log('id\tspoonacular_recipe_id\ttitle')
      for (const row of rows) {
        const id = row.id || ''
        const rid = row.spoonacular_recipe_id ?? ''
        const t = (row.title || '').replace(/\t/g, ' ')
        console.log(`${id}\t${rid}\t${t}`)
      }
      console.log(`\nTotal: ${rows.length}`)
    }
    if (args.writeRestoreListPath) {
      const outPath = args.writeRestoreListPath
      const ids = rows.map((r) => (r.id || '').trim()).filter(Boolean)
      const header = [
        '# gallery_meals.id — one UUID per line (auto-generated)',
        `# ${new Date().toISOString()}`,
        '# Next: npm run spoonacular-restore-meals -- --file=' + outPath.replace(/\\/g, '/'),
        ''
      ].join('\n')
      const body = `${ids.join('\n')}\n`
      try {
        writeFileSync(outPath, header + body, 'utf8')
        console.log(`Wrote ${ids.length} meal id(s) to ${outPath}`)
      } catch (e) {
        console.error('Could not write restore list file:', e.message)
        process.exit(1)
      }
    }
    return
  }

  if (args.mealIds.length === 0) {
    console.error('No meal ids. Use --file=, --ids=, or GALLERY_MEAL_IDS=uuid1,uuid2')
    console.error('Or: npm run spoonacular-restore-meals -- --write-restore-list')
    process.exit(1)
  }

  const found = []
  let mealsErr = null
  for (let i = 0; i < args.mealIds.length; i += GALLERY_MEAL_IN_BATCH) {
    const chunk = args.mealIds.slice(i, i + GALLERY_MEAL_IN_BATCH)
    const { data: chunkRows, error } = await supabase
      .from('gallery_meals')
      .select('id, title, spoonacular_recipe_id')
      .in('id', chunk)
    if (error) {
      mealsErr = error
      break
    }
    found.push(...(chunkRows || []))
  }

  if (mealsErr) {
    console.error('gallery_meals:', mealsErr.message)
    const c = mealsErr.cause
    if (c) console.error('  cause:', c.message || c)
    process.exit(1)
  }
  const foundIds = new Set(found.map((m) => m.id))
  for (const id of args.mealIds) {
    if (!foundIds.has(id)) console.warn('Unknown gallery_meals.id (skipped):', id)
  }
  if (found.length === 0) {
    console.error('No matching rows in gallery_meals.')
    process.exit(1)
  }

  console.log(`Loaded ${found.length} gallery meal(s). rematch-title=${args.rematchTitle} dry-run=${args.dryRun}`)

  if (args.rematchTitle) {
    for (const row of found) {
      const title = (row.title || '').trim()
      if (!title) {
        console.warn(`  Meal ${row.id}: no title, skip rematch`)
        continue
      }
      let ids = []
      try {
        ids = await searchRecipeIdsByTitle(title, 15)
        await sleep(200)
      } catch (e) {
        console.warn(`  Meal ${row.id} search: ${e.message}`)
        continue
      }
      const pick = ids[args.rematchIndex]
      if (pick == null) {
        console.warn(`  Meal ${row.id}: search returned fewer than ${args.rematchIndex + 1} results`)
        continue
      }
      const titleShort = title.length > 52 ? `${title.slice(0, 52)}…` : title
      console.log(`  ${row.id.slice(0, 8)}… "${titleShort}" → spoonacular_recipe_id ${pick}`)
      if (!args.dryRun) {
        const { error } = await supabase.from('gallery_meals').update({ spoonacular_recipe_id: pick }).eq('id', row.id)
        if (error) console.warn(`  Update failed: ${error.message}`)
        else row.spoonacular_recipe_id = pick
      }
    }
  }

  const recipeIds = [...new Set(found.map((m) => m.spoonacular_recipe_id).filter((x) => x != null))]
  if (recipeIds.length === 0) {
    console.error('No spoonacular_recipe_id on these meals after rematch. Use --rematch-title or fix links in DB.')
    process.exit(1)
  }

  console.log(`Bulk-fetching ${recipeIds.length} unique Spoonacular recipe(s)...`)
  if (args.dryRun) {
    console.log('Dry run: no fetch. Recipe ids:', recipeIds.join(', '))
    return
  }

  const allRecipes = []
  try {
    for (let off = 0; off < recipeIds.length; off += BULK_BATCH_SIZE) {
      const batch = recipeIds.slice(off, off + BULK_BATCH_SIZE)
      const recipes = await getRecipeInformationBulk(batch)
      allRecipes.push(...(Array.isArray(recipes) ? recipes : [recipes]))
      await sleep(200)
    }
  } catch (e) {
    if (e.message && e.message.includes('402')) {
      console.error('\nSpoonacular points exhausted (402). Try again tomorrow or upgrade plan.')
      process.exit(1)
    }
    throw e
  }

  console.log(`Saving details + ingredients for ${allRecipes.length} recipe payload(s)...`)
  await saveRecipesFromPayloads(allRecipes)
  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
