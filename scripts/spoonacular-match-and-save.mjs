/**
 * Match gallery_meals to Spoonacular recipes and save full recipe data to Supabase.
 *
 * Saves: recipe instructions (directions), portion sizes (servings), measurements (ingredient
 * amount/unit), meal/recipe photos (recipe-images bucket), ingredient photos (ingredient-images).
 * Each meal gets a recipe when possible (ingredients-first, then title, then retry with shorter title).
 *
 * 1. Fetch gallery_meals + food_items; match each meal to a Spoonacular recipe.
 * 2. Bulk fetch recipe info → save spoonacular_recipe_details (instructions, servings, image),
 *    recipe_ingredients (name, amount, unit for grocery list), download recipe + ingredient images.
 * 3. Update gallery_meals.spoonacular_recipe_id. App builds grocery list from recipe_ingredients.
 *
 * Requires: EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SPOONACULAR_API_KEY
 *
 * Usage: node -r dotenv/config scripts/spoonacular-match-and-save.mjs
 * Optional: LIMIT=50  (process only first N meals)
 * Optional: MATCH=name  (match by title only; default is ingredients-first)
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim()
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY?.trim()
const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : undefined
const MATCH_BY_NAME_ONLY = process.env.MATCH === 'name'

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}
if (!SPOONACULAR_API_KEY) {
  console.error('Missing SPOONACULAR_API_KEY.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const SPOONACULAR_BASE = 'https://api.spoonacular.com'
const INGREDIENT_IMAGE_BASE = 'https://img.spoonacular.com/ingredients_100x100'
const BULK_BATCH_SIZE = 50
const SEARCH_THROTTLE_MS = 350
const INGREDIENT_THROTTLE_MS = 100

function sleep (ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Search Spoonacular for recipes by query; return first result id or null.
 * If number is > 1, returns first result (for retry with more options).
 */
async function searchRecipeByTitle (query, number = 1) {
  const url = new URL(`${SPOONACULAR_BASE}/recipes/search`)
  url.searchParams.set('apiKey', SPOONACULAR_API_KEY)
  url.searchParams.set('query', (query || '').trim() || 'recipe')
  url.searchParams.set('number', String(number))
  const res = await fetch(url.toString())
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Spoonacular search ${res.status}: ${text.slice(0, 200)}`)
  }
  const data = await res.json()
  const first = data.results?.[0]
  return first?.id ?? null
}

/**
 * Find Spoonacular recipes by ingredients (comma-separated names); return first result id or null.
 * Uses findByIngredients API – recipes ranked by how many ingredients match.
 */
async function findRecipeByIngredients (ingredientNames) {
  const list = Array.isArray(ingredientNames) ? ingredientNames : [ingredientNames]
  const trimmed = list.map((s) => (s || '').trim()).filter(Boolean)
  if (trimmed.length === 0) return null
  const url = new URL(`${SPOONACULAR_BASE}/recipes/findByIngredients`)
  url.searchParams.set('apiKey', SPOONACULAR_API_KEY)
  url.searchParams.set('ingredients', trimmed.join(','))
  url.searchParams.set('number', '1')
  const res = await fetch(url.toString())
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Spoonacular findByIngredients ${res.status}: ${text.slice(0, 200)}`)
  }
  const data = await res.json()
  const first = Array.isArray(data) ? data[0] : null
  return first?.id ?? null
}

/**
 * Get recipe information (including extendedIngredients) for many ids.
 */
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
  return await res.json()
}

/**
 * Download image from Spoonacular and upload to Supabase Storage (ingredient-images bucket).
 * Returns public URL or null on failure.
 */
async function downloadAndUploadIngredientImage (ingredientId, imageFilename) {
  if (!imageFilename || !imageFilename.trim()) return null
  const spoonacularUrl = `${INGREDIENT_IMAGE_BASE}/${imageFilename.trim()}`
  const ext = imageFilename.includes('.') ? imageFilename.split('.').pop() : 'jpg'
  const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
  const storagePath = `${ingredientId}.${ext}`

  try {
    const imgRes = await fetch(spoonacularUrl)
    if (!imgRes.ok) return null
    const buf = await imgRes.arrayBuffer()
    const { error } = await supabase.storage
      .from('ingredient-images')
      .upload(storagePath, buf, { contentType, upsert: true })
    if (error) {
      console.warn(`  Upload ingredient ${storagePath}: ${error.message}`)
      return null
    }
    const { data: urlData } = supabase.storage.from('ingredient-images').getPublicUrl(storagePath)
    return urlData?.publicUrl ?? null
  } catch (err) {
    console.warn(`  Download ${spoonacularUrl}: ${err.message}`)
    return null
  }
}

/**
 * Download recipe image from Spoonacular (full URL or path) and upload to recipe-images bucket.
 * Returns public URL or null on failure.
 */
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
    const { error } = await supabase.storage
      .from('recipe-images')
      .upload(storagePath, buf, { contentType, upsert: true })
    if (error) {
      console.warn(`  Upload recipe ${storagePath}: ${error.message}`)
      return null
    }
    const { data: urlData } = supabase.storage.from('recipe-images').getPublicUrl(storagePath)
    return urlData?.publicUrl ?? null
  } catch (err) {
    console.warn(`  Download recipe image ${spoonacularUrl}: ${err.message}`)
    return null
  }
}

/** Build instructions text from Spoonacular (prefer structured steps when HTML is one blob). */
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

async function main () {
  console.log('Fetching gallery_meals and food_items...')
  let mealsQuery = supabase
    .from('gallery_meals')
    .select('id, title, base_id, protein_id, vegetable_id')
    .order('sort_order', { ascending: true })
  if (LIMIT) mealsQuery = mealsQuery.limit(LIMIT)
  const { data: meals, error: fetchError } = await mealsQuery
  const { data: foodItems, error: foodError } = await supabase.from('food_items').select('id, name')

  if (fetchError) {
    console.error('Supabase gallery_meals error:', fetchError.message)
    process.exit(1)
  }
  if (foodError) {
    console.error('Supabase food_items error:', foodError.message)
    process.exit(1)
  }
  if (!meals?.length) {
    console.log('No gallery meals found.')
    return
  }

  const idToName = new Map()
  for (const row of foodItems || []) {
    if (row?.id && row?.name) idToName.set(row.id, String(row.name).trim())
  }

  const matchMode = MATCH_BY_NAME_ONLY ? 'name' : 'ingredients-first'
  console.log(`Found ${meals.length} meals. Matching to Spoonacular (${matchMode}, throttle ${SEARCH_THROTTLE_MS}ms)...`)

  const mealToRecipeId = new Map()
  for (let i = 0; i < meals.length; i++) {
    const { id, title, base_id, protein_id, vegetable_id } = meals[i]
    const safeTitle = (title || '').trim() || 'meal'
    let recipeId = null
    try {
      if (!MATCH_BY_NAME_ONLY) {
        const ingredientNames = [base_id, protein_id, vegetable_id]
          .filter(Boolean)
          .map((uid) => idToName.get(uid))
          .filter(Boolean)
        if (ingredientNames.length > 0) {
          recipeId = await findRecipeByIngredients(ingredientNames)
          await sleep(SEARCH_THROTTLE_MS)
        }
      }
      if (recipeId == null) {
        recipeId = await searchRecipeByTitle(safeTitle)
        await sleep(SEARCH_THROTTLE_MS)
      }
      if (recipeId == null && safeTitle !== 'meal') {
        const shortQuery = safeTitle.split(/\s+/).slice(0, 3).join(' ')
        if (shortQuery) {
          recipeId = await searchRecipeByTitle(shortQuery, 5)
          await sleep(SEARCH_THROTTLE_MS)
        }
      }
      if (recipeId != null) mealToRecipeId.set(id, recipeId)
      if ((i + 1) % 20 === 0) console.log(`  Progress: ${i + 1}/${meals.length}`)
    } catch (err) {
      console.warn(`  [${i + 1}] "${safeTitle}" – ${err.message}`)
    }
  }

  const uniqueRecipeIds = [...new Set(mealToRecipeId.values())]
  console.log(`Matched ${mealToRecipeId.size} meals to ${uniqueRecipeIds.length} unique Spoonacular recipes.`)

  if (uniqueRecipeIds.length === 0) {
    console.log('No recipe matches; nothing to fetch or save.')
    return
  }

  // Persist meal → recipe links now so they're visible even if bulk fetch hits rate limit (402)
  let updatedMeals = 0
  for (const [mealId, recipeId] of mealToRecipeId) {
    const { error: updateError } = await supabase
      .from('gallery_meals')
      .update({ spoonacular_recipe_id: recipeId })
      .eq('id', mealId)
    if (!updateError) updatedMeals++
  }
  console.log(`Saved ${updatedMeals} meal→recipe links to gallery_meals. Run "npm run spoonacular-list-matches" to see them.`)

  const allRecipes = []
  try {
    for (let off = 0; off < uniqueRecipeIds.length; off += BULK_BATCH_SIZE) {
      const batch = uniqueRecipeIds.slice(off, off + BULK_BATCH_SIZE)
      const recipes = await getRecipeInformationBulk(batch)
      allRecipes.push(...(Array.isArray(recipes) ? recipes : [recipes]))
      await sleep(200)
    }
  } catch (err) {
    if (err.message && err.message.includes('402')) {
      console.warn('\nSpoonacular daily points limit reached (402). Meal→recipe links were saved above.')
      console.warn('Upgrade your plan or run again tomorrow to fetch full recipe details and images.')
      console.warn('View matches: npm run spoonacular-list-matches')
      return
    }
    throw err
  }

  console.log('Saving recipe details, ingredients, and recipe photos...')
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

  const ingredientsSeen = new Set()
  const toUpsert = []
  let uploaded = 0
  let skipped = 0

  for (const recipe of allRecipes) {
    const ingredients = recipe.extendedIngredients || []
    for (const ing of ingredients) {
      const id = ing.id
      const image = ing.image
      const name = (ing.name || ing.original || '').trim() || null
      if (id == null || !image) continue
      if (ingredientsSeen.has(id)) {
        skipped++
        continue
      }
      ingredientsSeen.add(id)
      const imageUrl = await downloadAndUploadIngredientImage(id, image)
      if (imageUrl) {
        toUpsert.push({
          spoonacular_ingredient_id: id,
          name,
          image_url: imageUrl
        })
        uploaded++
      }
      await sleep(INGREDIENT_THROTTLE_MS)
    }
  }

  if (toUpsert.length > 0) {
    const UPSERT_BATCH = 100
    let upserted = 0
    for (let i = 0; i < toUpsert.length; i += UPSERT_BATCH) {
      const batch = toUpsert.slice(i, i + UPSERT_BATCH)
      const { error: upsertError } = await supabase
        .from('ingredient_assets')
        .upsert(batch, {
          onConflict: 'spoonacular_ingredient_id',
          ignoreDuplicates: false
        })
      if (upsertError) {
        console.error('ingredient_assets upsert error:', upsertError.message)
        break
      }
      upserted += batch.length
    }
    console.log(`Saved ${upserted} ingredient images to ingredient_assets (${uploaded} uploaded, ${skipped} duplicates skipped).`)
  } else {
    console.log('No new ingredient images to save.')
  }

  console.log(`Updated gallery_meals.spoonacular_recipe_id for ${mealToRecipeId.size} meals (already saved above).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
