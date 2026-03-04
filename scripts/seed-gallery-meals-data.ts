/**
 * Data for gallery_meals seed. Maps dish title + description to food_item UUIDs.
 * Run: npx ts-node scripts/seed-gallery-meals-data.ts  (or use to generate SQL)
 */
const B = {
  rice: '11111111-1111-1111-1111-111111111101',
  quinoa: '11111111-1111-1111-1111-111111111102',
  beans: '11111111-1111-1111-1111-111111111103',
  bread: '11111111-1111-1111-1111-111111111104',
  tortilla: '11111111-1111-1111-1111-111111111105',
  oatmeal: '11111111-1111-1111-1111-111111111106',
  toast: '11111111-1111-1111-1111-111111111107',
  yogurt: '11111111-1111-1111-1111-111111111108',
  pasta: '11111111-1111-1111-1111-11111111110b',
  noodles: '11111111-1111-1111-1111-11111111110c',
  ramen: '11111111-1111-1111-1111-111111111113',
  pancakes: '11111111-1111-1111-1111-11111111110a'
}
const P = {
  chicken: '22222222-2222-2222-2222-222222222201',
  tofu: '22222222-2222-2222-2222-222222222202',
  fish: '22222222-2222-2222-2222-222222222203',
  eggs: '22222222-2222-2222-2222-222222222204',
  salmon: '22222222-2222-2222-2222-222222222206',
  beef: '22222222-2222-2222-2222-222222222207',
  shrimp: '22222222-2222-2222-2222-222222222209',
  beans: '22222222-2222-2222-2222-22222222220a',
  pork: '22222222-2222-2222-2222-22222222220c',
  lamb: '22222222-2222-2222-2222-22222222220d',
  tuna: '22222222-2222-2222-2222-22222222220e',
  sausage: '22222222-2222-2222-2222-22222222220f',
  ham: '22222222-2222-2222-2222-222222222210',
  lentils: '22222222-2222-2222-2222-222222222211',
  chickpeas: '22222222-2222-2222-2222-222222222212'
}
const V = {
  greens: '33333333-3333-3333-3333-333333333301',
  broccoli: '33333333-3333-3333-3333-333333333302',
  spinach: '33333333-3333-3333-3333-333333333303',
  avocado: '33333333-3333-3333-3333-333333333304',
  tomatoes: '33333333-3333-3333-3333-333333333305',
  'bell peppers': '33333333-3333-3333-3333-333333333306',
  carrots: '33333333-3333-3333-3333-333333333307',
  zucchini: '33333333-3333-3333-3333-333333333308',
  berries: '33333333-3333-3333-3333-333333333309',
  mushrooms: '33333333-3333-3333-3333-33333333330a',
  kale: '33333333-3333-3333-3333-33333333330b',
  onions: '33333333-3333-3333-3333-33333333330c',
  cucumber: '33333333-3333-3333-3333-33333333330d',
  corn: '33333333-3333-3333-3333-33333333330e',
  peas: '33333333-3333-3333-3333-33333333330f',
  'sweet potato': '33333333-3333-3333-3333-333333333310',
  eggplant: '33333333-3333-3333-3333-333333333311',
  cabbage: '33333333-3333-3333-3333-333333333312',
  lettuce: '33333333-3333-3333-3333-333333333313',
  asparagus: '33333333-3333-3333-3333-333333333314',
  'green beans': '33333333-3333-3333-3333-333333333315'
}

export type GalleryMealRow = {
  title: string
  description: string
  base_id: string
  protein_id: string
  vegetable_id: string
  cooking_method: string
  base_group: string
  meal_type: string
}

export const GALLERY_MEALS_DATA: GalleryMealRow[] = [
  // RICE BASES (35)
  { title: 'Japanese Salmon Poke Bowl', description: 'Raw salmon, cucumber, rice, sesame seeds, green onions, ginger', base_id: B.rice, protein_id: P.salmon, vegetable_id: V.cucumber, cooking_method: 'raw', base_group: 'rice', meal_type: 'any' },
  { title: 'Thai Basil Chicken Bowl', description: 'Grilled chicken, bell peppers, rice, basil, chili, garlic', base_id: B.rice, protein_id: P.chicken, vegetable_id: V['bell peppers'], cooking_method: 'grilled', base_group: 'rice', meal_type: 'any' },
  { title: 'Indian Chicken Curry Rice', description: 'Stove chicken, spinach, rice, cumin, turmeric, ginger', base_id: B.rice, protein_id: P.chicken, vegetable_id: V.spinach, cooking_method: 'stove', base_group: 'rice', meal_type: 'any' },
  { title: 'Jamaican Jerk Chicken Rice', description: 'Grilled chicken, bell peppers, rice, allspice, chili, thyme', base_id: B.rice, protein_id: P.chicken, vegetable_id: V['bell peppers'], cooking_method: 'grilled', base_group: 'rice', meal_type: 'any' },
  { title: 'Mexican Burrito Bowl', description: 'Grilled chicken, black beans, rice, tomatoes, avocado, lime, cilantro', base_id: B.rice, protein_id: P.chicken, vegetable_id: V.tomatoes, cooking_method: 'grilled', base_group: 'rice', meal_type: 'any' },
  { title: 'Korean Beef Bowl', description: 'Stove beef, carrots, rice, sesame seeds, green onions, garlic', base_id: B.rice, protein_id: P.beef, vegetable_id: V.carrots, cooking_method: 'stove', base_group: 'rice', meal_type: 'any' },
  { title: 'Spanish Seafood Rice', description: 'Grilled shrimp, peas, rice, paprika, garlic, parsley', base_id: B.rice, protein_id: P.shrimp, vegetable_id: V.peas, cooking_method: 'grilled', base_group: 'rice', meal_type: 'any' },
  { title: 'Moroccan Chickpea Rice', description: 'Stove chickpeas, carrots, rice, cumin, ginger, cilantro', base_id: B.rice, protein_id: P.chickpeas, vegetable_id: V.carrots, cooking_method: 'stove', base_group: 'rice', meal_type: 'any' },
  { title: 'Cajun Shrimp Rice', description: 'Grilled shrimp, bell peppers, rice, paprika, garlic, chili', base_id: B.rice, protein_id: P.shrimp, vegetable_id: V['bell peppers'], cooking_method: 'grilled', base_group: 'rice', meal_type: 'any' },
  { title: 'Greek Chicken Rice Bowl', description: 'Grilled chicken, spinach, rice, oregano, garlic, lemon', base_id: B.rice, protein_id: P.chicken, vegetable_id: V.spinach, cooking_method: 'grilled', base_group: 'rice', meal_type: 'any' },
  { title: 'Peruvian Lime Chicken Rice', description: 'Grilled chicken, corn, rice, lime, cilantro, garlic', base_id: B.rice, protein_id: P.chicken, vegetable_id: V.corn, cooking_method: 'grilled', base_group: 'rice', meal_type: 'any' },
  { title: 'Indonesian Fried Rice', description: 'Stove chicken, carrots, rice, garlic, ginger, chili', base_id: B.rice, protein_id: P.chicken, vegetable_id: V.carrots, cooking_method: 'stove', base_group: 'rice', meal_type: 'any' },
  { title: 'Vietnamese Lemongrass Tofu Bowl', description: 'Grilled tofu, carrots, rice, ginger, lime, mint', base_id: B.rice, protein_id: P.tofu, vegetable_id: V.carrots, cooking_method: 'grilled', base_group: 'rice', meal_type: 'any' },
  { title: 'Turkish Lamb Rice', description: 'Grilled lamb, eggplant, rice, cumin, paprika, yogurt', base_id: B.rice, protein_id: P.lamb, vegetable_id: V.eggplant, cooking_method: 'grilled', base_group: 'rice', meal_type: 'any' },
  { title: 'Filipino Garlic Chicken Rice', description: 'Stove chicken, green beans, rice, garlic, vinegar', base_id: B.rice, protein_id: P.chicken, vegetable_id: V['green beans'], cooking_method: 'stove', base_group: 'rice', meal_type: 'any' },
  { title: 'Ethiopian Berbere Lentils', description: 'Stove lentils, kale, rice, berbere, cumin, ginger', base_id: B.rice, protein_id: P.lentils, vegetable_id: V.kale, cooking_method: 'stove', base_group: 'rice', meal_type: 'any' },
  { title: 'Brazilian Lime Fish Rice', description: 'Grilled fish, tomatoes, rice, lime, cilantro, garlic', base_id: B.rice, protein_id: P.fish, vegetable_id: V.tomatoes, cooking_method: 'grilled', base_group: 'rice', meal_type: 'any' },
  { title: 'Italian Risotto', description: 'Stove chicken, mushrooms, rice, oregano, basil, cheese', base_id: B.rice, protein_id: P.chicken, vegetable_id: V.mushrooms, cooking_method: 'stove', base_group: 'rice', meal_type: 'any' },
  { title: 'Lebanese Spiced Rice', description: 'Grilled chicken, chickpeas, rice, cumin, mint, parsley', base_id: B.rice, protein_id: P.chicken, vegetable_id: V.tomatoes, cooking_method: 'grilled', base_group: 'rice', meal_type: 'any' },
  { title: 'Chinese Ginger Scallion Fish', description: 'Steamed fish, bok choy, rice, ginger, green onions, soy', base_id: B.rice, protein_id: P.fish, vegetable_id: V.greens, cooking_method: 'steamed', base_group: 'rice', meal_type: 'any' },
  { title: 'Caribbean Coconut Rice', description: 'Grilled shrimp, black beans, rice, lime, cilantro, allspice', base_id: B.rice, protein_id: P.shrimp, vegetable_id: V.tomatoes, cooking_method: 'grilled', base_group: 'rice', meal_type: 'any' },
  { title: 'Malaysian Chili Shrimp', description: 'Grilled shrimp, pineapple, rice, chili, ginger, lime', base_id: B.rice, protein_id: P.shrimp, vegetable_id: V['bell peppers'], cooking_method: 'grilled', base_group: 'rice', meal_type: 'any' },
  { title: 'French Herbed Chicken Rice', description: 'Baked chicken, asparagus, rice, herbs, garlic, parsley', base_id: B.rice, protein_id: P.chicken, vegetable_id: V.asparagus, cooking_method: 'baked', base_group: 'rice', meal_type: 'any' },
  { title: 'Mediterranean Tuna Rice', description: 'Raw tuna, tomatoes, rice, oregano, olives, lemon', base_id: B.rice, protein_id: P.tuna, vegetable_id: V.tomatoes, cooking_method: 'raw', base_group: 'rice', meal_type: 'any' },
  { title: 'Southern Red Beans Rice', description: 'Stove sausage, bell peppers, rice, paprika, garlic, hot sauce', base_id: B.rice, protein_id: P.sausage, vegetable_id: V['bell peppers'], cooking_method: 'stove', base_group: 'rice', meal_type: 'any' },
  { title: 'Thai Green Curry Rice', description: 'Stove tofu, eggplant, rice, basil, chili, ginger', base_id: B.rice, protein_id: P.tofu, vegetable_id: V.eggplant, cooking_method: 'stove', base_group: 'rice', meal_type: 'any' },
  { title: 'Japanese Teriyaki Salmon', description: 'Grilled salmon, broccoli, rice, ginger, sesame seeds, soy', base_id: B.rice, protein_id: P.salmon, vegetable_id: V.broccoli, cooking_method: 'grilled', base_group: 'rice', meal_type: 'any' },
  { title: 'Indian Tandoori Chicken Rice', description: 'Grilled chicken, onions, rice, cumin, coriander, turmeric', base_id: B.rice, protein_id: P.chicken, vegetable_id: V.onions, cooking_method: 'grilled', base_group: 'rice', meal_type: 'any' },
  { title: 'Mexican Shrimp Ceviche Rice', description: 'Raw shrimp, avocado, rice, lime, cilantro, chili', base_id: B.rice, protein_id: P.shrimp, vegetable_id: V.avocado, cooking_method: 'raw', base_group: 'rice', meal_type: 'any' },
  { title: 'Korean Bibimbap Bowl', description: 'Stove beef, spinach, rice, sesame seeds, gochujang, egg', base_id: B.rice, protein_id: P.beef, vegetable_id: V.spinach, cooking_method: 'stove', base_group: 'rice', meal_type: 'any' },
  { title: 'Vietnamese Rice Noodle Bowl', description: 'Grilled pork, carrots, rice, mint, lime, cilantro', base_id: B.rice, protein_id: P.pork, vegetable_id: V.carrots, cooking_method: 'grilled', base_group: 'rice', meal_type: 'any' },
  { title: 'Jamaican Rice & Peas', description: 'Stove beans, bell peppers, rice, thyme, allspice, chili', base_id: B.rice, protein_id: P.beans, vegetable_id: V['bell peppers'], cooking_method: 'stove', base_group: 'rice', meal_type: 'any' },
  { title: 'Spanish Paella', description: 'Grilled shrimp, peas, rice, saffron, paprika, garlic', base_id: B.rice, protein_id: P.shrimp, vegetable_id: V.peas, cooking_method: 'grilled', base_group: 'rice', meal_type: 'any' },
  { title: 'Moroccan Chicken Tagine Rice', description: 'Baked chicken, sweet potato, rice, cumin, ginger, cinnamon', base_id: B.rice, protein_id: P.chicken, vegetable_id: V['sweet potato'], cooking_method: 'baked', base_group: 'rice', meal_type: 'any' },
  { title: 'Italian Mushroom Risotto', description: 'Stove mushrooms, spinach, rice, garlic, parmesan, parsley', base_id: B.rice, protein_id: P.tofu, vegetable_id: V.mushrooms, cooking_method: 'stove', base_group: 'rice', meal_type: 'any' },
  // NOODLE & RAMEN (25)
  { title: 'Japanese Ramen', description: 'Boiled pork, mushrooms, noodles, ginger, green onions, soy', base_id: B.noodles, protein_id: P.pork, vegetable_id: V.mushrooms, cooking_method: 'boiled', base_group: 'noodles', meal_type: 'any' },
  { title: 'Thai Drunken Noodles', description: 'Stove chicken, bell peppers, noodles, basil, chili, garlic', base_id: B.noodles, protein_id: P.chicken, vegetable_id: V['bell peppers'], cooking_method: 'stove', base_group: 'noodles', meal_type: 'any' },
  { title: 'Chinese Lo Mein', description: 'Stove shrimp, carrots, noodles, ginger, garlic, green onions', base_id: B.noodles, protein_id: P.shrimp, vegetable_id: V.carrots, cooking_method: 'stove', base_group: 'noodles', meal_type: 'any' },
  { title: 'Vietnamese Pho', description: 'Boiled beef, onions, noodles, ginger, lime, cilantro', base_id: B.noodles, protein_id: P.beef, vegetable_id: V.onions, cooking_method: 'boiled', base_group: 'noodles', meal_type: 'any' },
  { title: 'Korean Japchae', description: 'Stove beef, spinach, noodles, sesame seeds, garlic, soy', base_id: B.noodles, protein_id: P.beef, vegetable_id: V.spinach, cooking_method: 'stove', base_group: 'noodles', meal_type: 'any' },
  { title: 'Indonesian Mie Goreng', description: 'Stove chicken, cabbage, noodles, garlic, chili, soy', base_id: B.noodles, protein_id: P.chicken, vegetable_id: V.cabbage, cooking_method: 'stove', base_group: 'noodles', meal_type: 'any' },
  { title: 'Japanese Udon', description: 'Boiled tofu, mushrooms, noodles, ginger, green onions, soy', base_id: B.noodles, protein_id: P.tofu, vegetable_id: V.mushrooms, cooking_method: 'boiled', base_group: 'noodles', meal_type: 'any' },
  { title: 'Malaysian Curry Noodles', description: 'Stove shrimp, bell peppers, noodles, curry, lime, cilantro', base_id: B.noodles, protein_id: P.shrimp, vegetable_id: V['bell peppers'], cooking_method: 'stove', base_group: 'noodles', meal_type: 'any' },
  { title: 'Thai Coconut Noodles', description: 'Stove chicken, broccoli, noodles, basil, ginger, lime', base_id: B.noodles, protein_id: P.chicken, vegetable_id: V.broccoli, cooking_method: 'stove', base_group: 'noodles', meal_type: 'any' },
  { title: 'Chinese Dan Dan Noodles', description: 'Stove pork, bok choy, noodles, chili, sesame, green onions', base_id: B.noodles, protein_id: P.pork, vegetable_id: V.greens, cooking_method: 'stove', base_group: 'noodles', meal_type: 'any' },
  { title: 'Vietnamese Bun Cha', description: 'Grilled pork, lettuce, noodles, mint, lime, cilantro', base_id: B.noodles, protein_id: P.pork, vegetable_id: V.lettuce, cooking_method: 'grilled', base_group: 'noodles', meal_type: 'any' },
  { title: 'Korean Spicy Noodles', description: 'Stove beef, zucchini, noodles, gochujang, garlic, sesame', base_id: B.noodles, protein_id: P.beef, vegetable_id: V.zucchini, cooking_method: 'stove', base_group: 'noodles', meal_type: 'any' },
  { title: 'Japanese Soba', description: 'Cold noodles, tofu, cucumber, ginger, green onions, soy', base_id: B.noodles, protein_id: P.tofu, vegetable_id: V.cucumber, cooking_method: 'raw', base_group: 'noodles', meal_type: 'any' },
  { title: 'Thai Peanut Noodles', description: 'Stove tofu, bell peppers, noodles, peanut, lime, cilantro', base_id: B.noodles, protein_id: P.tofu, vegetable_id: V['bell peppers'], cooking_method: 'stove', base_group: 'noodles', meal_type: 'any' },
  { title: 'Chinese Chow Mein', description: 'Stove chicken, cabbage, noodles, ginger, garlic, soy', base_id: B.noodles, protein_id: P.chicken, vegetable_id: V.cabbage, cooking_method: 'stove', base_group: 'noodles', meal_type: 'any' },
  { title: 'Vietnamese Spring Rolls', description: 'Raw shrimp, lettuce, noodles, mint, lime, cilantro', base_id: B.noodles, protein_id: P.shrimp, vegetable_id: V.lettuce, cooking_method: 'raw', base_group: 'noodles', meal_type: 'any' },
  { title: 'Japanese Yakisoba', description: 'Stove pork, cabbage, noodles, ginger, sesame, soy', base_id: B.noodles, protein_id: P.pork, vegetable_id: V.cabbage, cooking_method: 'stove', base_group: 'noodles', meal_type: 'any' },
  { title: 'Thai Tom Yum Noodles', description: 'Boiled shrimp, mushrooms, noodles, chili, lime, cilantro', base_id: B.noodles, protein_id: P.shrimp, vegetable_id: V.mushrooms, cooking_method: 'boiled', base_group: 'noodles', meal_type: 'any' },
  { title: 'Korean Ramyun', description: 'Boiled beef, kimchi, noodles, chili, garlic, green onions', base_id: B.noodles, protein_id: P.beef, vegetable_id: V.cabbage, cooking_method: 'boiled', base_group: 'noodles', meal_type: 'any' },
  { title: 'Chinese Sesame Noodles', description: 'Cold noodles, cucumber, carrots, sesame, soy, green onions', base_id: B.noodles, protein_id: P.tofu, vegetable_id: V.cucumber, cooking_method: 'raw', base_group: 'noodles', meal_type: 'any' },
  { title: 'Japanese Tsukemen', description: 'Boiled pork, bamboo shoots, noodles, ginger, garlic, soy', base_id: B.noodles, protein_id: P.pork, vegetable_id: V.carrots, cooking_method: 'boiled', base_group: 'noodles', meal_type: 'any' },
  { title: 'Vietnamese Bun Bo Hue', description: 'Boiled beef, lemongrass, noodles, chili, lime, cilantro', base_id: B.noodles, protein_id: P.beef, vegetable_id: V.onions, cooking_method: 'boiled', base_group: 'noodles', meal_type: 'any' },
  { title: 'Thai Khao Soi', description: 'Boiled chicken, shallots, noodles, curry, lime, cilantro', base_id: B.noodles, protein_id: P.chicken, vegetable_id: V.onions, cooking_method: 'boiled', base_group: 'noodles', meal_type: 'any' },
  { title: 'Chinese Hot & Sour Noodles', description: 'Boiled tofu, mushrooms, noodles, chili, vinegar, ginger', base_id: B.noodles, protein_id: P.tofu, vegetable_id: V.mushrooms, cooking_method: 'boiled', base_group: 'noodles', meal_type: 'any' },
  { title: 'Japanese Cold Ramen', description: 'Cold noodles, ham, cucumber, ginger, sesame, soy', base_id: B.noodles, protein_id: P.ham, vegetable_id: V.cucumber, cooking_method: 'raw', base_group: 'noodles', meal_type: 'any' },
]
