import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('Missing Supabase env vars')
  process.exit(1)
}

const supabase = createClient(url, key)
const FEELINGS = [
  'warm_me_up',
  'cool_me_off',
  'light',
  'heavy',
  'hearty',
  'earthy',
  'cleansing',
  'rejuvenating',
  'energy_booster',
  'comforting',
  'refreshing',
  'cozy',
  'indulgent',
  'simple',
  'adventurous'
]

function addScore (scoreMap, key, value) {
  scoreMap[key] = (scoreMap[key] || 0) + value
}

function textHasAny (text, parts) {
  return parts.some((part) => text.includes(part))
}

function pickFeeling (meal) {
  const text = `${meal.title || ''} ${meal.description || ''}`.toLowerCase()
  const method = (meal.cooking_method || '').toLowerCase()
  const group = (meal.base_group || '').toLowerCase()
  const mealType = (meal.meal_type || '').toLowerCase()
  const s = Object.fromEntries(FEELINGS.map((f) => [f, 0]))

  if (group === 'soup') {
    addScore(s, 'warm_me_up', 4)
    addScore(s, 'comforting', 3)
    addScore(s, 'cozy', 3)
    addScore(s, 'hearty', 2)
  }
  if (
    ['boiled', 'boil', 'steamed', 'steam', 'baked', 'bake', 'stove', 'grilled', 'grill', 'slow_cook', 'pressure_cook'].includes(method) &&
    ['rice', 'pasta', 'bread', 'potato', 'legume', 'corn', 'dough', 'quinoa', 'tortilla'].includes(group)
  ) {
    addScore(s, 'warm_me_up', 2)
    addScore(s, 'hearty', 2)
    addScore(s, 'comforting', 1)
    addScore(s, 'cozy', 1)
  }
  if (textHasAny(text, ['soup', 'stew', 'chowder', 'curry', 'pho', 'ramen', 'hot pot'])) {
    addScore(s, 'warm_me_up', 3)
    addScore(s, 'comforting', 2)
    addScore(s, 'cozy', 2)
  }
  if (
    method === 'raw' ||
    ['salad', 'seaweed'].includes(group) ||
    textHasAny(text, ['salad', 'ceviche', 'cold ', 'smoothie', 'poke'])
  ) {
    addScore(s, 'cool_me_off', 3)
    addScore(s, 'refreshing', 2)
    addScore(s, 'light', 2)
    addScore(s, 'cleansing', 2)
  }
  if (['quinoa', 'seed', 'plant'].includes(group)) {
    addScore(s, 'light', 2)
    addScore(s, 'cleansing', 2)
    addScore(s, 'rejuvenating', 1)
  }
  if (['pasta', 'dough', 'potato', 'pizza'].includes(group)) {
    addScore(s, 'heavy', 3)
    addScore(s, 'hearty', 2)
  }
  if (group === 'legume') {
    addScore(s, 'earthy', 2)
    addScore(s, 'hearty', 1)
    addScore(s, 'heavy', 1)
  }
  if (['rice', 'potato', 'pasta', 'bread', 'legume', 'soup', 'tortilla', 'corn', 'quinoa'].includes(group)) {
    addScore(s, 'hearty', 1)
  }
  if (
    ['legume', 'quinoa', 'potato', 'fermented', 'bread'].includes(group) ||
    textHasAny(text, ['lentil', 'bean', 'dal', 'mujadara'])
  ) {
    addScore(s, 'earthy', 2)
  }
  if (
    ['salad', 'plant', 'quinoa', 'seed'].includes(group) ||
    method === 'raw' ||
    textHasAny(text, ['lemon', 'lime', 'cucumber', 'mint'])
  ) {
    addScore(s, 'cleansing', 1)
  }
  if (['breakfast', 'seed'].includes(group) || textHasAny(text, ['oat', 'yogurt', 'berry'])) {
    addScore(s, 'rejuvenating', 2)
    addScore(s, 'energy_booster', 2)
  }
  if (
    ['breakfast', 'toast'].includes(group) ||
    mealType === 'breakfast' ||
    textHasAny(text, ['eggs', 'banana', 'oatmeal'])
  ) {
    addScore(s, 'energy_booster', 1)
  }
  if (
    (
      ['soup', 'bread', 'pasta', 'rice', 'potato'].includes(group) &&
      ['baked', 'bake', 'stove', 'boiled', 'boil', 'steamed', 'steam'].includes(method)
    ) ||
    textHasAny(text, ['mac and cheese', 'risotto', 'casserole'])
  ) {
    addScore(s, 'comforting', 2)
    addScore(s, 'cozy', 1)
  }
  if (['salad', 'seaweed'].includes(group) || textHasAny(text, ['citrus', 'lemon', 'lime', 'fresh'])) {
    addScore(s, 'refreshing', 2)
  }
  if (group === 'soup' || textHasAny(text, ['stew', 'casserole', 'warm'])) {
    addScore(s, 'cozy', 1)
  }
  if (
    ['dessert', 'pizza'].includes(group) ||
    textHasAny(text, ['cake', 'chocolate', 'tiramisu', 'baklava', 'churros', 'fondue', 'poutine'])
  ) {
    addScore(s, 'indulgent', 3)
  }
  if (['rice', 'bread', 'toast', 'pasta'].includes(group) || textHasAny(text, ['simple', 'easy', 'basic'])) {
    addScore(s, 'simple', 1)
  }
  if (
    ['noodles', 'sushi', 'fermented', 'seaweed', 'dough'].includes(group) ||
    textHasAny(text, ['sushi', 'pho', 'ramen', 'kimchi', 'dumpling', 'okonomiyaki'])
  ) {
    addScore(s, 'adventurous', 2)
  }

  const ranked = FEELINGS
    .slice()
    .sort((a, b) => (s[b] - s[a]) || (FEELINGS.indexOf(a) - FEELINGS.indexOf(b)))
  const best = ranked[0]
  return (s[best] || 0) > 0 ? best : 'simple'
}

const { data: meals, error } = await supabase
  .from('gallery_meals')
  .select('id,title,description,base_group,cooking_method,meal_type,feeling_ids')

if (error) {
  console.error(error.message)
  process.exit(1)
}

const before = {}
for (const m of meals) {
  const ids = Array.isArray(m.feeling_ids) ? m.feeling_ids : []
  const id = ids[0] || 'none'
  before[id] = (before[id] || 0) + 1
}

const updates = meals.map((meal) => ({ id: meal.id, feeling: pickFeeling(meal) }))

let written = 0
const batch = 40
for (let i = 0; i < updates.length; i += batch) {
  const chunk = updates.slice(i, i + batch)
  const results = await Promise.all(
    chunk.map((u) =>
      supabase
        .from('gallery_meals')
        .update({ feeling_ids: [u.feeling] })
        .eq('id', u.id)
    )
  )
  for (const r of results) {
    if (r.error) {
      console.error(r.error.message)
      process.exit(1)
    }
    written++
  }
}

const after = {}
for (const u of updates) {
  after[u.feeling] = (after[u.feeling] || 0) + 1
}

console.log(JSON.stringify({
  updated_rows: written,
  distribution_before: before,
  distribution_after: after
}, null, 2))
