import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim()
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY?.trim()

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SPOONACULAR_API_KEY) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL/SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or SPOONACULAR_API_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const SPOONACULAR_BASE = 'https://api.spoonacular.com'
const INGREDIENT_IMAGE_BASE = 'https://img.spoonacular.com/ingredients_100x100'
const PER_VIBE = 15 // 9 vibes * 2 = 18 new meals

const VIBE_SEARCH = [
  { vibe: 'warm_me_up', queries: ['warm soup', 'stew', 'hot curry'] },
  { vibe: 'cool_me_off', queries: ['cold salad', 'chilled noodles', 'gazpacho'] },
  { vibe: 'light', queries: ['light lunch', 'light salad', 'low calorie meal'] },
  { vibe: 'earthy', queries: ['mushroom lentil', 'root vegetable', 'earthy grain bowl'] },
  { vibe: 'cleansing', queries: ['detox salad', 'clean eating bowl', 'green bowl'] },
  { vibe: 'rejuvenating', queries: ['healthy bowl', 'revitalizing breakfast', 'power bowl'] },
  { vibe: 'comforting', queries: ['comfort food', 'cozy pasta', 'home style casserole'] },
  { vibe: 'indulgent', queries: ['decadent dessert', 'rich pasta', 'indulgent dinner'] },
  { vibe: 'adventurous', queries: ['fusion dish', 'kimchi', 'sushi inspired'] }
]

function sleep (ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function clean (v) {
  return String(v || '').trim().replace(/\s+/g, ' ')
}

/** Same logic as spoonacular-match-and-save: prefer analyzed steps when HTML is one blob. */
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

function uniqNames (items) {
  const seen = new Set()
  const out = []
  for (const n of items) {
    const c = clean(n)
    if (!c) continue
    const k = c.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(c)
  }
  return out
}

async function spoonacularSearchIds (query, number = 20, offset = 0) {
  const url = new URL(`${SPOONACULAR_BASE}/recipes/complexSearch`)
  url.searchParams.set('apiKey', SPOONACULAR_API_KEY)
  url.searchParams.set('query', query)
  url.searchParams.set('number', String(number))
  url.searchParams.set('offset', String(offset))
  const res = await fetch(url.toString())
  if (!res.ok) return []
  const data = await res.json()
  return (data.results || []).map((r) => r.id).filter((id) => Number.isInteger(id))
}

async function fetchRecipeInformationBulk (ids) {
  if (!ids.length) return []
  const url = new URL(`${SPOONACULAR_BASE}/recipes/informationBulk`)
  url.searchParams.set('apiKey', SPOONACULAR_API_KEY)
  url.searchParams.set('ids', ids.join(','))
  const res = await fetch(url.toString())
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(`Spoonacular bulk ${res.status}: ${msg.slice(0, 180)}`)
  }
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

function detectMealType (recipe) {
  const dishTypes = Array.isArray(recipe.dishTypes) ? recipe.dishTypes.map((d) => String(d).toLowerCase()) : []
  if (dishTypes.includes('breakfast')) return 'breakfast'
  if (dishTypes.includes('lunch')) return 'lunch'
  if (dishTypes.includes('dinner')) return 'dinner'
  return 'any'
}

function detectCookingMethod (recipe) {
  const t = `${clean(recipe.instructions)} ${(recipe.analyzedInstructions?.[0]?.steps || []).map((s) => clean(s.step)).join(' ')}`.toLowerCase()
  if (!t) return 'stove'
  if (/(bake|oven|roast)/.test(t)) return 'baked'
  if (/(steam|steamed)/.test(t)) return 'steamed'
  if (/(boil|simmer|poach)/.test(t)) return 'boiled'
  if (/(grill|char|broil)/.test(t)) return 'grilled'
  if (/(fry|saute|sauté|stir)/.test(t)) return 'fried'
  if (/(raw|chill|cold)/.test(t)) return 'raw'
  return 'stove'
}

function detectBaseGroup (recipe, ingredientNames) {
  const text = `${clean(recipe.title)} ${ingredientNames.join(' ')}`.toLowerCase()
  if (/\bsoup|stew|broth|chowder|bisque\b/.test(text)) return 'soup'
  if (/\bsalad|slaw\b/.test(text)) return 'salad'
  if (/\bsushi|maki|nigiri\b/.test(text)) return 'sushi'
  if (/\bnoodle|ramen|udon|soba|spaghetti|linguine\b/.test(text)) return 'noodles'
  if (/\bpasta|penne|fusilli|macaroni|lasagna|gnocchi\b/.test(text)) return 'pasta'
  if (/\brice|risotto\b/.test(text)) return 'rice'
  if (/\bquinoa|couscous|farro|barley\b/.test(text)) return 'quinoa'
  if (/\btortilla|taco|burrito|quesadilla|wrap\b/.test(text)) return 'tortilla'
  if (/\bpizza\b/.test(text)) return 'pizza'
  if (/\bbread|sandwich|bun|bagel\b/.test(text)) return 'bread'
  if (/\bpotato|yam|sweet potato\b/.test(text)) return 'potato'
  if (/\bbean|lentil|chickpea\b/.test(text)) return 'legume'
  if (/\bseaweed\b/.test(text)) return 'seaweed'
  if (/\bferment|kimchi|tempeh|miso\b/.test(text)) return 'fermented'
  if (/\bdessert|cake|cookie|brownie|ice cream|tart\b/.test(text)) return 'dessert'
  return 'any'
}

function findFoodIdByKeywords (foodByName, keywords) {
  for (const kw of keywords) {
    const k = kw.toLowerCase()
    if (foodByName.has(k)) return foodByName.get(k)
  }
  for (const [name, id] of foodByName.entries()) {
    if (keywords.some((kw) => name.includes(kw.toLowerCase()))) return id
  }
  return null
}

function detectBaseProteinVegIds (ingredientNames, foodByName) {
  const all = ingredientNames.map((s) => s.toLowerCase())
  const joined = all.join(' ')

  const baseId = findFoodIdByKeywords(foodByName, [
    /\brice\b/.test(joined) ? 'rice' : '',
    /\bnoodle|ramen|udon|soba\b/.test(joined) ? 'noodles' : '',
    /\bpasta|spaghetti|penne|fusilli|gnocchi\b/.test(joined) ? 'pasta' : '',
    /\bquinoa\b/.test(joined) ? 'quinoa' : '',
    /\btortilla|wrap\b/.test(joined) ? 'tortilla' : '',
    /\bbread|bun|bagel\b/.test(joined) ? 'bread' : '',
    /\bpotato|yam|sweet potato\b/.test(joined) ? 'potato' : ''
  ].filter(Boolean))

  const proteinId = findFoodIdByKeywords(foodByName, [
    /\bchicken\b/.test(joined) ? 'chicken' : '',
    /\bbeef|steak\b/.test(joined) ? 'beef' : '',
    /\bpork|bacon\b/.test(joined) ? 'pork' : '',
    /\bsalmon\b/.test(joined) ? 'salmon' : '',
    /\bshrimp|prawn\b/.test(joined) ? 'shrimp' : '',
    /\btuna\b/.test(joined) ? 'tuna' : '',
    /\btofu\b/.test(joined) ? 'tofu' : '',
    /\begg\b/.test(joined) ? 'eggs' : ''
  ].filter(Boolean))

  const vegetableId = findFoodIdByKeywords(foodByName, [
    /\bbroccoli\b/.test(joined) ? 'broccoli' : '',
    /\bspinach\b/.test(joined) ? 'spinach' : '',
    /\bavocado\b/.test(joined) ? 'avocado' : '',
    /\btomato\b/.test(joined) ? 'tomato' : '',
    /\bcucumber\b/.test(joined) ? 'cucumber' : '',
    /\bcarrot\b/.test(joined) ? 'carrot' : '',
    /\blettuce|greens\b/.test(joined) ? 'greens' : ''
  ].filter(Boolean))

  return { baseId, proteinId, vegetableId }
}

async function main () {
  const { data: existingMeals, error: existingErr } = await supabase
    .from('gallery_meals')
    .select('title, spoonacular_recipe_id, sort_order')

  if (existingErr) {
    console.error(existingErr.message)
    process.exit(1)
  }

  const { data: foodItems, error: foodErr } = await supabase.from('food_items').select('id, name')
  if (foodErr) {
    console.error(foodErr.message)
    process.exit(1)
  }

  const existingRecipeIds = new Set((existingMeals || []).map((m) => m.spoonacular_recipe_id).filter(Boolean))
  const existingTitles = new Set((existingMeals || []).map((m) => clean(m.title).toLowerCase()).filter(Boolean))
  const maxSort = (existingMeals || []).reduce((acc, row) => Math.max(acc, Number(row.sort_order || 0)), 0)
  const foodByName = new Map((foodItems || []).map((f) => [clean(f.name).toLowerCase(), f.id]))

  const picked = []
  const pickedIds = new Set()
  for (const target of VIBE_SEARCH) {
    let count = 0
    for (const q of target.queries) {
      if (count >= PER_VIBE) break
      for (let page = 0; page < 10; page++) {
        if (count >= PER_VIBE) break
        const ids = await spoonacularSearchIds(q, 25, page * 25)
        await sleep(280)
        if (ids.length === 0) break
        for (const id of ids) {
          if (count >= PER_VIBE) break
          if (existingRecipeIds.has(id) || pickedIds.has(id)) continue
          picked.push({ recipeId: id, vibe: target.vibe })
          pickedIds.add(id)
          count++
        }
      }
    }
  }

  if (picked.length < 15) {
    console.error(`Only found ${picked.length} candidate recipes; expected at least 15`)
    process.exit(1)
  }

  const recipeIds = picked.map((p) => p.recipeId)
  const recipes = []
  for (let i = 0; i < recipeIds.length; i += 40) {
    const chunk = recipeIds.slice(i, i + 40)
    const rows = await fetchRecipeInformationBulk(chunk)
    recipes.push(...rows)
    await sleep(220)
  }

  const vibeByRecipe = new Map(picked.map((p) => [p.recipeId, p.vibe]))
  const insertRows = []
  const detailRows = []
  const ingredientRows = []
  const ingredientAssetRows = []
  let sortOrder = maxSort
  const skippedByTitle = []

  for (const recipe of recipes) {
    const rid = recipe.id
    if (rid == null) continue
    const title = clean(recipe.title)
    if (!title) continue
    const titleKey = title.toLowerCase()
    if (existingTitles.has(titleKey)) {
      skippedByTitle.push(title)
      continue
    }
    existingTitles.add(titleKey)
    const vibe = vibeByRecipe.get(rid) || 'simple'
    const ingredients = Array.isArray(recipe.extendedIngredients) ? recipe.extendedIngredients : []
    const ingredientNames = uniqNames(ingredients.map((ing) => ing.name || ing.original || ''))
    const description = ingredientNames.join(', ')
    const method = detectCookingMethod(recipe)
    const mealType = detectMealType(recipe)
    const baseGroup = detectBaseGroup(recipe, ingredientNames)
    const { baseId, proteinId, vegetableId } = detectBaseProteinVegIds(ingredientNames, foodByName)
    sortOrder += 1

    insertRows.push({
      title,
      description: description || null,
      base_id: baseId,
      protein_id: proteinId,
      vegetable_id: vegetableId,
      cooking_method: method,
      meal_type: mealType,
      base_group: baseGroup,
      sort_order: sortOrder,
      feeling_ids: [vibe],
      spoonacular_recipe_id: rid,
      // Same URL as spoonacular_recipe_details.image_url; app dedupes when merging for display
      image_urls: recipe.image ? [recipe.image] : []
    })

    detailRows.push({
      spoonacular_recipe_id: rid,
      title,
      instructions: (getInstructionsText(recipe) || '').trim() || null,
      servings: Number.isFinite(recipe.servings) ? Number(recipe.servings) : null,
      ready_in_minutes: Number.isFinite(recipe.readyInMinutes) ? Number(recipe.readyInMinutes) : null,
      image_url: recipe.image || null,
      cuisine: Array.isArray(recipe.cuisines) && recipe.cuisines.length > 0 ? clean(recipe.cuisines[0]) : null,
      updated_at: new Date().toISOString()
    })

    ingredients.forEach((ing, idx) => {
      ingredientRows.push({
        spoonacular_recipe_id: rid,
        spoonacular_ingredient_id: ing.id ?? null,
        name: clean(ing.name || ing.original || 'Ingredient'),
        amount: ing.amount != null ? Number(ing.amount) : null,
        unit: clean(ing.unit || '') || null,
        sort_order: idx
      })
      if (ing.id != null && clean(ing.image)) {
        ingredientAssetRows.push({
          spoonacular_ingredient_id: ing.id,
          name: clean(ing.name || ing.original || '') || null,
          image_url: `${INGREDIENT_IMAGE_BASE}/${clean(ing.image)}`
        })
      }
    })
  }

  if (insertRows.length < 15) {
    console.error(`Only ${insertRows.length} unique new meals after duplicate-title filtering; expected at least 15`)
    process.exit(1)
  }

  const { error: detailErr } = await supabase
    .from('spoonacular_recipe_details')
    .upsert(detailRows, { onConflict: 'spoonacular_recipe_id' })
  if (detailErr) {
    console.error(detailErr.message)
    process.exit(1)
  }

  const recipeIdsToReplace = [...new Set(insertRows.map((r) => r.spoonacular_recipe_id))]
  if (recipeIdsToReplace.length > 0) {
    const { error: delErr } = await supabase
      .from('recipe_ingredients')
      .delete()
      .in('spoonacular_recipe_id', recipeIdsToReplace)
    if (delErr) {
      console.error(delErr.message)
      process.exit(1)
    }
  }

  if (ingredientRows.length > 0) {
    const { error: ingErr } = await supabase.from('recipe_ingredients').insert(ingredientRows)
    if (ingErr) {
      console.error(ingErr.message)
      process.exit(1)
    }
  }

  const dedupAssets = new Map()
  for (const row of ingredientAssetRows) dedupAssets.set(row.spoonacular_ingredient_id, row)
  const { error: assetErr } = await supabase
    .from('ingredient_assets')
    .upsert([...dedupAssets.values()], { onConflict: 'spoonacular_ingredient_id' })
  if (assetErr) {
    console.error(assetErr.message)
    process.exit(1)
  }

  const { data: inserted, error: insertErr } = await supabase
    .from('gallery_meals')
    .insert(insertRows)
    .select('id,title,feeling_ids')
  if (insertErr) {
    console.error(insertErr.message)
    process.exit(1)
  }

  const byVibe = {}
  for (const row of insertRows) {
    const vibe = row.feeling_ids?.[0] || 'none'
    byVibe[vibe] = (byVibe[vibe] || 0) + 1
  }

  console.log(JSON.stringify({
    inserted_count: inserted?.length || 0,
    inserted_by_vibe: byVibe,
    skipped_duplicate_titles: skippedByTitle.length
  }, null, 2))
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
