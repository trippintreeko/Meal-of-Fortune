/**
 * 1. Find gallery_meals with duplicate titles (same Spoonacular title); re-assign duplicates
 *    to a different Spoonacular recipe (same ingredients or cuisine/style) so each meal has
 *    a distinct recipe and title.
 * 2. Find gallery_meals with no spoonacular_recipe_id (unmatched); search Spoonacular
 *    by ingredients or style and pull in a recipe.
 *
 * Keeps all 360 rows; only updates spoonacular_recipe_id (and later title) for duplicates
 * and unmatched. Uses findByIngredients(number=15) and search(number=10) to get options
 * and picks a recipe id not already used.
 *
 * Requires: EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SPOONACULAR_API_KEY
 *
 * Usage: node -r dotenv/config scripts/spoonacular-dedupe-and-backfill.mjs
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim()
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY?.trim()
const THROTTLE_MS = 400

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SPOONACULAR_API_KEY) {
  console.error('Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or SPOONACULAR_API_KEY.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const SPOONACULAR_BASE = 'https://api.spoonacular.com'
const INGREDIENT_IMAGE_BASE = 'https://img.spoonacular.com/ingredients_100x100'

function sleep (ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Get multiple recipe ids from Spoonacular by ingredients (returns array of { id }). */
async function findRecipesByIngredients (ingredientNames, number = 15) {
  const list = Array.isArray(ingredientNames) ? ingredientNames : [ingredientNames]
  const trimmed = list.map((s) => (s || '').trim()).filter(Boolean)
  if (trimmed.length === 0) return []
  const url = new URL(`${SPOONACULAR_BASE}/recipes/findByIngredients`)
  url.searchParams.set('apiKey', SPOONACULAR_API_KEY)
  url.searchParams.set('ingredients', trimmed.join(','))
  url.searchParams.set('number', String(Math.min(number, 50)))
  const res = await fetch(url.toString())
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data.filter((r) => r.id != null).map((r) => ({ id: r.id })) : []
}

/** Get multiple recipe ids from Spoonacular search by query (e.g. cuisine/style). */
async function searchRecipesByQuery (query, number = 10) {
  const q = (query || '').trim() || 'recipe'
  const url = new URL(`${SPOONACULAR_BASE}/recipes/search`)
  url.searchParams.set('apiKey', SPOONACULAR_API_KEY)
  url.searchParams.set('query', q)
  url.searchParams.set('number', String(Math.min(number, 50)))
  const res = await fetch(url.toString())
  if (!res.ok) return []
  const data = await res.json()
  const results = data.results || []
  return results.filter((r) => r.id != null).map((r) => ({ id: r.id }))
}

async function getRecipeInformationBulk (ids) {
  if (ids.length === 0) return []
  const url = new URL(`${SPOONACULAR_BASE}/recipes/informationBulk`)
  url.searchParams.set('apiKey', SPOONACULAR_API_KEY)
  url.searchParams.set('ids', ids.join(','))
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`Bulk ${res.status}`)
  const data = await res.json()
  return Array.isArray(data) ? data : [data]
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

async function downloadAndUploadRecipeImage (recipeId, imageUrlOrPath) {
  if (!imageUrlOrPath || !String(imageUrlOrPath).trim()) return null
  let url = imageUrlOrPath
  if (!url.startsWith('http')) url = `https://img.spoonacular.com/recipes/${url}`
  const ext = url.includes('.webp') ? 'webp' : url.includes('.png') ? 'png' : 'jpg'
  const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    const { error } = await supabase.storage.from('recipe-images').upload(`${recipeId}.${ext}`, buf, { contentType, upsert: true })
    if (error) return null
    const { data } = supabase.storage.from('recipe-images').getPublicUrl(`${recipeId}.${ext}`)
    return data?.publicUrl ?? null
  } catch {
    return null
  }
}

async function downloadAndUploadIngredientImage (ingredientId, imageFilename) {
  if (!imageFilename || !String(imageFilename).trim()) return null
  const url = `${INGREDIENT_IMAGE_BASE}/${imageFilename.trim()}`
  const ext = imageFilename.includes('.') ? imageFilename.split('.').pop() : 'jpg'
  const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    const { error } = await supabase.storage.from('ingredient-images').upload(`${ingredientId}.${ext}`, buf, { contentType, upsert: true })
    if (error) return null
    const { data } = supabase.storage.from('ingredient-images').getPublicUrl(`${ingredientId}.${ext}`)
    return data?.publicUrl ?? null
  } catch {
    return null
  }
}

async function main () {
  console.log('Loading gallery_meals and food_items...')
  const { data: meals, error: mealsErr } = await supabase
    .from('gallery_meals')
    .select('id, title, spoonacular_recipe_id, base_id, protein_id, vegetable_id, base_group')
    .order('sort_order', { ascending: true })

  if (mealsErr || !meals?.length) {
    console.error('Failed to load gallery_meals:', mealsErr?.message || 'No data')
    process.exit(1)
  }

  const { data: foodItems } = await supabase.from('food_items').select('id, name')
  const idToName = new Map()
  for (const r of foodItems || []) {
    if (r?.id && r?.name) idToName.set(r.id, String(r.name).trim())
  }

  const byTitle = new Map()
  for (const m of meals) {
    const t = (m.title || '').trim() || '(no title)'
    if (!byTitle.has(t)) byTitle.set(t, [])
    byTitle.get(t).push(m)
  }

  const toRematchIds = new Set()
  for (const [, group] of byTitle) {
    if (group.length <= 1) continue
    for (let i = 1; i < group.length; i++) toRematchIds.add(group[i].id)
  }
  const unmatched = meals.filter((m) => m.spoonacular_recipe_id == null)
  for (const m of unmatched) toRematchIds.add(m.id)

  const toRematch = meals.filter((m) => toRematchIds.has(m.id))
  const unmatOnly = toRematch.filter((m) => m.spoonacular_recipe_id == null).length
  const dupOnly = toRematch.length - unmatOnly

  const usedRecipeIds = new Set(meals.map((m) => m.spoonacular_recipe_id).filter((id) => id != null))
  console.log(`Duplicates (re-match): ${dupOnly}, Unmatched: ${unmatOnly}, Total to re-match: ${toRematch.length}`)
  console.log(`Unique recipe ids in use: ${usedRecipeIds.size}`)

  if (toRematch.length === 0) {
    console.log('No duplicates or unmatched meals; nothing to do.')
    return
  }

  const updates = []
  for (let i = 0; i < toRematch.length; i++) {
    const row = toRematch[i]
    const ingredientNames = [row.base_id, row.protein_id, row.vegetable_id]
      .filter(Boolean)
      .map((uid) => idToName.get(uid))
      .filter(Boolean)

    let candidates = []
    if (ingredientNames.length > 0) {
      try {
        candidates = await findRecipesByIngredients(ingredientNames, 15)
        await sleep(THROTTLE_MS)
      } catch (e) {
        console.warn(`  findByIngredients failed for meal ${row.id}:`, e.message)
      }
    }
    if (candidates.length === 0 && (row.base_group || row.title)) {
      const query = (row.base_group || (row.title || '').split(/\s+/).slice(0, 2).join(' ')).trim()
      if (query) {
        try {
          candidates = await searchRecipesByQuery(query, 10)
          await sleep(THROTTLE_MS)
        } catch (e) {
          console.warn(`  search failed for meal ${row.id}:`, e.message)
        }
      }
    }
    const chosen = candidates.find((c) => !usedRecipeIds.has(c.id))
    if (chosen) {
      usedRecipeIds.add(chosen.id)
      updates.push({ mealId: row.id, recipeId: chosen.id })
    }
    if ((i + 1) % 30 === 0) console.log(`  Re-match progress: ${i + 1}/${toRematch.length}`)
  }

  console.log(`Assigned new recipe to ${updates.length} meals.`)

  if (updates.length === 0) {
    console.log('No new assignments; skipping recipe fetch.')
    return
  }

  const newRecipeIds = [...new Set(updates.map((u) => u.recipeId))]
  console.log(`Fetching details for ${newRecipeIds.length} new recipes...`)

  const allRecipes = []
  const BULK = 50
  for (let off = 0; off < newRecipeIds.length; off += BULK) {
    try {
      const batch = newRecipeIds.slice(off, off + BULK)
      const recipes = await getRecipeInformationBulk(batch)
      allRecipes.push(...(Array.isArray(recipes) ? recipes : [recipes]))
      await sleep(300)
    } catch (e) {
      if (e.message && e.message.includes('402')) {
        console.warn('Spoonacular rate limit (402). Saving meal→recipe links only; run again later to fetch details.')
        for (const { mealId, recipeId } of updates) {
          await supabase.from('gallery_meals').update({ spoonacular_recipe_id: recipeId }).eq('id', mealId)
        }
        return
      }
      throw e
    }
  }

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
      if (!imageUrl && recipe.image.startsWith('http')) imageUrl = recipe.image
      else if (!imageUrl) imageUrl = `https://img.spoonacular.com/recipes/${recipe.image}`
    }
    const cuisine = Array.isArray(recipe.cuisines) && recipe.cuisines.length > 0
      ? (recipe.cuisines[0] || '').trim() || null
      : null
    await supabase.from('spoonacular_recipe_details').upsert(
      { spoonacular_recipe_id: rid, title, instructions, servings, ready_in_minutes: readyInMinutes, image_url: imageUrl, cuisine, updated_at: new Date().toISOString() },
      { onConflict: 'spoonacular_recipe_id' }
    )
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
      await supabase.from('recipe_ingredients').insert(rows)
    }
    for (const ing of ingredients) {
      if (ing.id == null || !ing.image) continue
      const imageUrlIng = await downloadAndUploadIngredientImage(ing.id, ing.image)
      if (imageUrlIng) {
        await supabase.from('ingredient_assets').upsert(
          { spoonacular_ingredient_id: ing.id, name: (ing.name || ing.original || '').trim() || null, image_url: imageUrlIng },
          { onConflict: 'spoonacular_ingredient_id' }
        )
      }
      await sleep(80)
    }
    await sleep(50)
  }

  const recipeIdToTitle = new Map()
  for (const r of allRecipes) {
    if (r.id != null && r.title) recipeIdToTitle.set(r.id, String(r.title).trim())
  }

  let updated = 0
  for (const { mealId, recipeId } of updates) {
    const newTitle = recipeIdToTitle.get(recipeId)
    const payload = { spoonacular_recipe_id: recipeId }
    if (newTitle) payload.title = newTitle
    const { error } = await supabase.from('gallery_meals').update(payload).eq('id', mealId)
    if (!error) updated++
  }

  console.log(`Updated ${updated} gallery_meals with new recipe and title.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
