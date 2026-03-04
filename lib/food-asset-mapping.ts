/**
 * Food asset mapping: maps 225+ food_items (by id) to ~50 local PNG assets
 * for minigames. Each asset can represent multiple food items (e.g. rice.png
 * for rice, quinoa, couscous). Seasonings and garnishes are not spawnable.
 *
 * To add new food items: add a new entry to DIRECT_FOOD_ID_TO_ASSET or
 * they will use CATEGORY_FALLBACKS / GENERIC_FALLBACK.
 * To add new assets: add the PNG to assets/food/, add the key to the
 * registry in food-asset-registry.ts, and map food ids to it here.
 */

export type FoodCategory = 'base' | 'protein' | 'vegetable' | 'seasoning' | 'garnish'

/** Categories that appear as catchable items in RiverNet and ConveyorBelt. */
export const SPAWNABLE_CATEGORIES: FoodCategory[] = ['base', 'protein', 'vegetable']

/** Asset keys (filename without .png). Must exist in food-asset-registry. */
export const ASSET_KEYS = [
  'rice',
  'noodle_macoronia',
  'green_noodles',
  'ramen',
  'bread',
  'beans',
  'oatmeal',
  'sushiBasic',
  'pierogi',
  'bread_balls_potatos',
  'soup',
  'bag_of_stuff',
  'chicken',
  'beef',
  'beefStew',
  'fish',
  'salmon',
  'shrimp',
  'tofu',
  'bacon',
  'eggs',
  'sausage',
  'vegetables',
  'avacado',
  'broccoli',
  'salad',
  'cheese',
  'seafood',
  'lentils',
  'tortilla',
  'grain',
  'pasta',
  'pork',
  'mushroom',
  'pepper',
  'corn',
  'onion',
  'beef_bulgogi_bowl',
  'better_somosas',
  'bettersuishi',
  'bowl_of_curry',
  'bread_balls',
  'burger',
  'cabbage',
  'calzones',
  'chicken_noodle_soup',
  'clam_chowder',
  'corn_chowder',
  'crossants',
  'dumplings',
  'empanadas',
  'falafal',
  'hardshell_taco',
  'hummus_bowl',
  'jambaliah',
  'lasagna',
  'naan',
  'poke_bowl',
  'pupusas',
  'raw_meat',
  'samosas',
  'sandwich_of_chicken',
  'shell_fish',
  'softshell_taco',
  'spring_rolls',
  'tamales',
  'tempeh',
  'turkey',
  'type_of_noodle',
  'zuchini'
] as const

export type FoodAssetKey = typeof ASSET_KEYS[number]

const GENERIC_FALLBACK: FoodAssetKey = 'bag_of_stuff'

const CATEGORY_FALLBACKS: Record<FoodCategory, FoodAssetKey | null> = {
  base: 'rice',
  protein: 'chicken',
  vegetable: 'vegetables',
  seasoning: null,
  garnish: null
}

/**
 * Direct mapping: food_items.id (UUID) → asset key.
 * Grouped so one asset represents many items (e.g. rice → rice, quinoa, couscous).
 */
const DIRECT_FOOD_ID_TO_ASSET: Record<string, FoodAssetKey> = {
  // ---- BASES (seed 1) ----
  '11111111-1111-1111-1111-111111111101': 'rice', // rice
  '11111111-1111-1111-1111-111111111102': 'rice', // quinoa
  '11111111-1111-1111-1111-111111111103': 'beans', // beans
  '11111111-1111-1111-1111-111111111104': 'bread', // bread
  '11111111-1111-1111-1111-111111111105': 'tortilla', // tortilla
  '11111111-1111-1111-1111-111111111106': 'oatmeal', // oatmeal
  '11111111-1111-1111-1111-111111111107': 'bread', // toast
  '11111111-1111-1111-1111-111111111108': 'oatmeal', // yogurt
  '11111111-1111-1111-1111-111111111109': 'grain', // cereal
  '11111111-1111-1111-1111-11111111110a': 'naan', // pancakes
  '11111111-1111-1111-1111-11111111110b': 'pasta', // pasta
  '11111111-1111-1111-1111-11111111110c': 'green_noodles', // noodles
  '11111111-1111-1111-1111-11111111110d': 'rice', // couscous
  '11111111-1111-1111-1111-11111111110e': 'grain', // polenta
  '11111111-1111-1111-1111-11111111110f': 'tortilla', // wraps
  '11111111-1111-1111-1111-111111111110': 'bread', // bagel
  '11111111-1111-1111-1111-111111111111': 'bread_balls_potatos', // hash browns
  '11111111-1111-1111-1111-111111111112': 'grain', // grits
  '11111111-1111-1111-1111-111111111113': 'ramen', // ramen
  '11111111-1111-1111-1111-111111111114': 'rice', // risotto
  // ---- BASES (expansion) ----
  '11111111-1111-1111-1111-111111111115': 'bread_balls_potatos', // potato
  '11111111-1111-1111-1111-111111111116': 'pierogi', // pierogi
  '11111111-1111-1111-1111-111111111117': 'dumplings', // gnocchi
  '11111111-1111-1111-1111-111111111118': 'bread_balls_potatos', // potato skins
  '11111111-1111-1111-1111-111111111119': 'bread_balls_potatos', // latkes
  '11111111-1111-1111-1111-11111111111a': 'bowl_of_curry', // aloo gobi
  '11111111-1111-1111-1111-11111111111b': 'tortilla', // corn masa
  '11111111-1111-1111-1111-11111111111c': 'tamales', // tamales
  '11111111-1111-1111-1111-11111111111d': 'pierogi', // arepas
  '11111111-1111-1111-1111-11111111111e': 'pupusas', // pupusas
  '11111111-1111-1111-1111-11111111111f': 'beefStew', // pozole
  '11111111-1111-1111-1111-111111111120': 'corn_chowder', // corn chowder
  '11111111-1111-1111-1111-111111111121': 'pupusas', // pizza dough
  '11111111-1111-1111-1111-111111111122': 'calzones', // calzone
  '11111111-1111-1111-1111-111111111123': 'empanadas', // empanadas
  '11111111-1111-1111-1111-111111111124': 'better_somosas', // samosas
  '11111111-1111-1111-1111-111111111125': 'bread_balls_potatos', // knishes
  '11111111-1111-1111-1111-111111111126': 'falafal', // falafel
  '11111111-1111-1111-1111-111111111127': 'lentils', // dal makhani
  '11111111-1111-1111-1111-111111111128': 'beef_bulgogi_bowl', // hummus bowl
  '11111111-1111-1111-1111-111111111129': 'bread_balls_potatos', // sweet potatos toast
  '11111111-1111-1111-1111-11111111112a': 'pasta', // cassava fries
  '11111111-1111-1111-1111-11111111112b': 'pasta', // yuca con mojo
  '11111111-1111-1111-1111-11111111112c': 'grain', // cauliflower rice
  '11111111-1111-1111-1111-11111111112d': 'pupusas', // cauliflower crust pizza
  '11111111-1111-1111-1111-11111111112e': 'type_of_noodle', // zucchini noodles
  '11111111-1111-1111-1111-11111111112f': 'pasta', // spaghetti squash
  '11111111-1111-1111-1111-111111111130': 'corn_chowder', // acorn squash bowl
  '11111111-1111-1111-1111-111111111131': 'rice', // butternut risotto
  '11111111-1111-1111-1111-111111111132': 'bread', // focaccia
  '11111111-1111-1111-1111-111111111133': 'bread', // ciabatta
  '11111111-1111-1111-1111-111111111134': 'bread', // baguette
  '11111111-1111-1111-1111-111111111135': 'naan', // naan
  '11111111-1111-1111-1111-111111111136': 'tortilla', // pita
  '11111111-1111-1111-1111-111111111137': 'naan', // roti
  '11111111-1111-1111-1111-111111111138': 'bread', // sourdough
  '11111111-1111-1111-1111-111111111139': 'naan', // injera
  '11111111-1111-1111-1111-11111111113a': 'tamales', // dosas
  '11111111-1111-1111-1111-11111111113b': 'sushiBasic', // nori wraps
  '11111111-1111-1111-1111-11111111113c': 'type_of_noodle', // kelp noodles
  '11111111-1111-1111-1111-11111111113d': 'green_noodles', // seaweed salad
  '11111111-1111-1111-1111-11111111113e': 'avacado', // plantain
  '11111111-1111-1111-1111-11111111113f': 'avacado', // breadfruit
  '11111111-1111-1111-1111-111111111140': 'tamales', // almond flour crusts
  '11111111-1111-1111-1111-111111111141': 'cheese', // cashew cheese base
  '11111111-1111-1111-1111-111111111142': 'bag_of_stuff', // chia pudding
  '11111111-1111-1111-1111-111111111143': 'poke_bowl', // hemp heart bowls
  '11111111-1111-1111-1111-111111111144': 'chicken_noodle_soup', // broth soups
  '11111111-1111-1111-1111-111111111145': 'corn_chowder', // chowders
  '11111111-1111-1111-1111-111111111146': 'clam_chowder', // bisques
  '11111111-1111-1111-1111-111111111147': 'salad', // kale caesar
  '11111111-1111-1111-1111-111111111148': 'salad', // cobb salad
  '11111111-1111-1111-1111-111111111149': 'salad', // nicoise salad
  '11111111-1111-1111-1111-11111111114a': 'rice', // sushi rice
  '11111111-1111-1111-1111-11111111114b': 'tamales', // phyllo
  // ---- PROTEINS (seed 1) ----
  '22222222-2222-2222-2222-222222222201': 'chicken', // chicken
  '22222222-2222-2222-2222-222222222202': 'tofu', // tofu
  '22222222-2222-2222-2222-222222222203': 'fish', // fish
  '22222222-2222-2222-2222-222222222204': 'eggs', // eggs
  '22222222-2222-2222-2222-222222222205': 'bacon', // bacon
  '22222222-2222-2222-2222-222222222206': 'salmon', // salmon
  '22222222-2222-2222-2222-222222222207': 'beef', // beef
  '22222222-2222-2222-2222-222222222208': 'turkey', // turkey
  '22222222-2222-2222-2222-222222222209': 'jambaliah', // shrimp
  '22222222-2222-2222-2222-22222222220a': 'beans', // beans
  '22222222-2222-2222-2222-22222222220b': 'tempeh', // tempeh
  '22222222-2222-2222-2222-22222222220c': 'sausage', // pork
  '22222222-2222-2222-2222-22222222220d': 'beef', // lamb
  '22222222-2222-2222-2222-22222222220e': 'fish', // tuna
  '22222222-2222-2222-2222-22222222220f': 'jambaliah', // sausage
  '22222222-2222-2222-2222-222222222210': 'pork', // ham
  '22222222-2222-2222-2222-222222222211': 'lentils', // lentils
  '22222222-2222-2222-2222-222222222212': 'beans', // chickpeas
  '22222222-2222-2222-2222-222222222213': 'shell_fish', // crab
  '22222222-2222-2222-2222-222222222214': 'shell_fish', // scallops
  // ---- PROTEINS (expansion) ----
  '22222222-2222-2222-2222-222222222215': 'beef', // venison
  '22222222-2222-2222-2222-222222222216': 'beef', // bison
  '22222222-2222-2222-2222-222222222217': 'beef', // elk
  '22222222-2222-2222-2222-222222222218': 'beef', // rabbit
  '22222222-2222-2222-2222-222222222219': 'turkey', // duck
  '22222222-2222-2222-2222-22222222221a': 'turkey', // quail
  '22222222-2222-2222-2222-22222222221b': 'bag_of_stuff', // liver
  '22222222-2222-2222-2222-22222222221c': 'bag_of_stuff', // heart
  '22222222-2222-2222-2222-22222222221d': 'bag_of_stuff', // tripe
  '22222222-2222-2222-2222-22222222221e': 'bag_of_stuff', // sweetbreads
  '22222222-2222-2222-2222-22222222221f': 'shell_fish', // mussels
  '22222222-2222-2222-2222-222222222220': 'shell_fish', // clams
  '22222222-2222-2222-2222-222222222221': 'shell_fish', // oysters
  '22222222-2222-2222-2222-222222222222': 'shell_fish', // lobster
  '22222222-2222-2222-2222-222222222223': 'shell_fish', // crawfish
  '22222222-2222-2222-2222-222222222224': 'bacon', // prosciutto
  '22222222-2222-2222-2222-222222222225': 'bacon', // pancetta
  '22222222-2222-2222-2222-222222222226': 'sausage', // chorizo cured
  '22222222-2222-2222-2222-222222222227': 'sausage', // salami
  '22222222-2222-2222-2222-222222222228': 'sausage', // soppressata
  '22222222-2222-2222-2222-222222222229': 'tofu', // smoked tofu
  '22222222-2222-2222-2222-22222222222a': 'tofu', // silken tofu
  '22222222-2222-2222-2222-22222222222b': 'tofu', // fried tofu puffs
  '22222222-2222-2222-2222-22222222222c': 'tofu', // seitan
  '22222222-2222-2222-2222-22222222222d': 'tofu', // bbq seitan
  '22222222-2222-2222-2222-22222222222e': 'bag_of_stuff', // jerky
  '22222222-2222-2222-2222-22222222222f': 'bag_of_stuff', // jackfruit
  '22222222-2222-2222-2222-222222222230': 'bag_of_stuff', // crickets
  '22222222-2222-2222-2222-222222222231': 'bag_of_stuff', // mealworms
  '22222222-2222-2222-2222-222222222232': 'tofu', // plant-based crumbles
  '22222222-2222-2222-2222-222222222233': 'bag_of_stuff', // octopus
  '22222222-2222-2222-2222-222222222234': 'bag_of_stuff', // calamari
  '22222222-2222-2222-2222-222222222235': 'bag_of_stuff', // frog legs
  // ---- VEGETABLES (seed 1) ----
  '33333333-3333-3333-3333-333333333301': 'salad', // salad greens
  '33333333-3333-3333-3333-333333333302': 'onion', // broccoli
  '33333333-3333-3333-3333-333333333303': 'cabbage', // spinach
  '33333333-3333-3333-3333-333333333304': 'avacado', // avocado
  '33333333-3333-3333-3333-333333333305': 'zuchini', // tomatoes
  '33333333-3333-3333-3333-333333333306': 'pepper', // bell peppers
  '33333333-3333-3333-3333-333333333307': 'zuchini', // carrots
  '33333333-3333-3333-3333-333333333308': 'zuchini', // zucchini
  '33333333-3333-3333-3333-333333333309': 'vegetables', // berries
  '33333333-3333-3333-3333-33333333330a': 'mushroom', // mushrooms
  '33333333-3333-3333-3333-33333333330b': 'cabbage', // kale
  '33333333-3333-3333-3333-33333333330c': 'onion', // onions
  '33333333-3333-3333-3333-33333333330d': 'zuchini', // cucumber
  '33333333-3333-3333-3333-33333333330e': 'corn', // corn
  '33333333-3333-3333-3333-33333333330f': 'vegetables', // peas
  '33333333-3333-3333-3333-333333333310': 'bread_balls_potatos', // sweet potatos
  '33333333-3333-3333-3333-333333333311': 'zuchini', // eggplant
  '33333333-3333-3333-3333-333333333312': 'cabbage', // cabbage
  '33333333-3333-3333-3333-333333333313': 'salad', // lettuce
  '33333333-3333-3333-3333-333333333314': 'onion', // asparagus
  '33333333-3333-3333-3333-333333333315': 'vegetables', // green beans
  '33333333-3333-3333-3333-333333333316': 'vegetables', // brussels sprouts
  // ---- VEGETABLES (expansion) ----
  '33333333-3333-3333-3333-333333333317': 'type_of_noodle', // wakame
  '33333333-3333-3333-3333-333333333318': 'green_noodles', // kombu
  '33333333-3333-3333-3333-333333333319': 'cabbage', // dulse
  '33333333-3333-3333-3333-33333333331a': 'green_noodles', // hijiki
  '33333333-3333-3333-3333-33333333331b': 'green_noodles', // irish moss
  '33333333-3333-3333-3333-33333333331c': 'onion', // bean sprouts
  '33333333-3333-3333-3333-33333333331d': 'vegetables', // alfalfa
  '33333333-3333-3333-3333-33333333331e': 'onion', // broccoli sprouts
  '33333333-3333-3333-3333-33333333331f': 'onion', // radish sprouts
  '33333333-3333-3333-3333-333333333320': 'zuchini', // okra
  '33333333-3333-3333-3333-333333333321': 'zuchini', // bitter melon
  '33333333-3333-3333-3333-333333333322': 'zuchini', // chayote
  '33333333-3333-3333-3333-333333333323': 'dumplings', // jicama
  '33333333-3333-3333-3333-333333333324': 'vegetables', // kohlrabi
  '33333333-3333-3333-3333-333333333325': 'mushroom', // morels
  '33333333-3333-3333-3333-333333333326': 'mushroom', // chanterelles
  '33333333-3333-3333-3333-333333333327': 'mushroom', // porcini
  '33333333-3333-3333-3333-333333333328': 'mushroom', // truffles
  '33333333-3333-3333-3333-333333333329': 'pepper', // habanero
  '33333333-3333-3333-3333-33333333332a': 'pepper', // scotch bonnet
  '33333333-3333-3333-3333-33333333332b': 'pepper', // ghost pepper
  '33333333-3333-3333-3333-33333333332c': 'pepper', // poblano
  '33333333-3333-3333-3333-33333333332d': 'bread_balls_potatos', // taro
  '33333333-3333-3333-3333-33333333332e': 'bread_balls_potatos', // malanga
  '33333333-3333-3333-3333-33333333332f': 'bread_balls_potatos', // oca
  '33333333-3333-3333-3333-333333333330': 'bread_balls_potatos', // mashua
  '33333333-3333-3333-3333-333333333331': 'grain', // wheatberries
  '33333333-3333-3333-3333-333333333332': 'grain', // farro
  '33333333-3333-3333-3333-333333333333': 'grain', // spelt
  '33333333-3333-3333-3333-333333333334': 'grain', // teff
  '33333333-3333-3333-3333-333333333335': 'vegetables', // squash blossoms
  '33333333-3333-3333-3333-333333333336': 'vegetables', // nasturtiums
  '33333333-3333-3333-3333-333333333337': 'vegetables', // dandelion greens
  '33333333-3333-3333-3333-333333333338': 'vegetables', // fiddleheads
  '33333333-3333-3333-3333-333333333339': 'vegetables', // nopales
  '33333333-3333-3333-3333-33333333333a': 'vegetables', // prickly pear pads
  '33333333-3333-3333-3333-33333333333b': 'onion', // bamboo shoots
  '33333333-3333-3333-3333-33333333333c': 'vegetables', // lotus root
  '33333333-3333-3333-3333-33333333333d': 'vegetables', // ramps
  // Seasonings and garnishes: not spawnable; if ever needed use fallback
  ...Object.fromEntries(
    [
      '44444444-4444-4444-4444-444444444401', '44444444-4444-4444-4444-444444444402',
      '44444444-4444-4444-4444-444444444403', '44444444-4444-4444-4444-444444444404',
      '44444444-4444-4444-4444-444444444405', '44444444-4444-4444-4444-444444444406',
      '44444444-4444-4444-4444-444444444407', '44444444-4444-4444-4444-444444444408',
      '44444444-4444-4444-4444-444444444409', '44444444-4444-4444-4444-44444444440a',
      '44444444-4444-4444-4444-44444444440b', '44444444-4444-4444-4444-44444444440c',
      '44444444-4444-4444-4444-44444444440d', '44444444-4444-4444-4444-44444444440e',
      '44444444-4444-4444-4444-44444444440f',
      '55555555-5555-5555-5555-555555555501', '55555555-5555-5555-5555-555555555502',
      '55555555-5555-5555-5555-555555555503', '55555555-5555-5555-5555-555555555504',
      '55555555-5555-5555-5555-555555555505', '55555555-5555-5555-5555-555555555506',
      '55555555-5555-5555-5555-555555555507', '55555555-5555-5555-5555-555555555508',
      '55555555-5555-5555-5555-555555555509', '55555555-5555-5555-5555-55555555550a',
      '55555555-5555-5555-5555-55555555550b', '55555555-5555-5555-5555-55555555550c',
      '55555555-5555-5555-5555-55555555550d', '55555555-5555-5555-5555-55555555550e',
      '55555555-5555-5555-5555-55555555550f', '55555555-5555-5555-5555-555555555510',
      '55555555-5555-5555-5555-555555555511', '55555555-5555-5555-5555-555555555512',
      '55555555-5555-5555-5555-555555555513', '55555555-5555-5555-5555-555555555514',
      '55555555-5555-5555-5555-555555555515'
    ].map((id) => [id, 'bag_of_stuff' as FoodAssetKey])
  )
}

/**
 * Returns the asset key (filename without .png) for a food item.
 * Use with getFoodAssetSource() from food-asset-registry to get the image source.
 */
export function getFoodAsset (
  foodId: string,
  _foodName: string,
  category: FoodCategory
): FoodAssetKey {
  const direct = DIRECT_FOOD_ID_TO_ASSET[foodId]
  if (direct) return direct
  const fallback = CATEGORY_FALLBACKS[category]
  return fallback ?? GENERIC_FALLBACK
}

/**
 * Filters food items to only base, protein, vegetable (no seasonings or garnishes)
 * for use in minigame spawners.
 */
export function filterSpawnableFoodItems<T extends { category?: string }> (
  items: T[]
): T[] {
  return items.filter((item) =>
    SPAWNABLE_CATEGORIES.includes((item.category ?? '') as FoodCategory)
  )
}

/** All food IDs that can appear in round 1–2 (base, protein, vegetable). Used to mark uncollected as don't want before round 3. */
export function getAllSpawnableFoodIds (): string[] {
  const keys = Object.keys(DIRECT_FOOD_ID_TO_ASSET)
  return keys.filter(
    (id) =>
      id.startsWith('11111111-') || id.startsWith('22222222-') || id.startsWith('33333333-')
  )
}

/** Usage count per asset key (how many food items map to each). For reporting which assets are shared vs single-use vs unused. */
export function getAssetUsageReport (): { assetKey: FoodAssetKey; count: number }[] {
  const counts: Record<string, number> = {}
  for (const key of ASSET_KEYS) counts[key] = 0
  for (const asset of Object.values(DIRECT_FOOD_ID_TO_ASSET)) {
    counts[asset] = (counts[asset] ?? 0) + 1
  }
  return ASSET_KEYS.map((assetKey) => ({ assetKey, count: counts[assetKey] ?? 0 }))
}
