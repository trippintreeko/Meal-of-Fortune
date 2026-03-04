/**
 * Dietary restriction definitions for quick grouping in Food Preferences.
 * Names must match food_items.name (case-insensitive) from supabase/seed-food-items.sql.
 *
 * Favorites tab + diet: select all foods in allowedNames (foods OK for that diet).
 * Dislikes / Not Today tab + diet: select all foods in excludedNames (foods to avoid).
 */

export type DietDefinition = {
  id: string
  label: string
  /** Food names that ARE allowed on this diet (used when applying in Favorites) */
  allowedNames: string[]
  /** Food names that are NOT allowed on this diet (used when applying in Dislikes / Not Today) */
  excludedNames: string[]
}

const normalize = (name: string) => name.trim().toLowerCase()

export const DIETS: DietDefinition[] = [
  {
    id: 'vegan',
    label: 'Vegan',
    allowedNames: [
      'rice', 'quinoa', 'beans', 'bread', 'tortilla', 'oatmeal', 'toast', 'cereal', 'pancakes', 'pasta', 'noodles',
      'couscous', 'polenta', 'wraps', 'bagel', 'hash browns', 'grits', 'ramen', 'risotto',
      'tofu', 'tempeh', 'lentils', 'chickpeas',
      'salad greens', 'broccoli', 'spinach', 'avocado', 'tomatoes', 'bell peppers', 'carrots', 'zucchini', 'berries', 'mushrooms', 'kale', 'onions',
      'cucumber', 'corn', 'peas', 'sweet potato', 'eggplant', 'cabbage', 'lettuce', 'asparagus', 'green beans', 'brussels sprouts',
      'garlic', 'salt', 'pepper', 'chili', 'herbs', 'paprika', 'cumin', 'oregano', 'basil', 'ginger',
      'sauce', 'lime', 'cilantro', 'green onions', 'nuts', 'sesame seeds', 'parsley', 'hot sauce',
      'olives', 'pickles', 'hummus', 'guacamole', 'salsa', 'balsamic', 'dill', 'mint'
    ],
    excludedNames: [
      'yogurt', 'chicken', 'fish', 'eggs', 'bacon', 'salmon', 'beef', 'turkey', 'shrimp', 'pork', 'lamb', 'tuna', 'sausage', 'ham', 'crab', 'scallops',
      'cheese', 'sour cream'
    ]
  },
  {
    id: 'vegetarian',
    label: 'Vegetarian',
    allowedNames: [
      'rice', 'quinoa', 'beans', 'bread', 'tortilla', 'oatmeal', 'toast', 'yogurt', 'cereal', 'pancakes', 'pasta', 'noodles',
      'couscous', 'polenta', 'wraps', 'bagel', 'hash browns', 'grits', 'ramen', 'risotto',
      'tofu', 'tempeh', 'eggs', 'beans', 'lentils', 'chickpeas',
      'salad greens', 'broccoli', 'spinach', 'avocado', 'tomatoes', 'bell peppers', 'carrots', 'zucchini', 'berries', 'mushrooms', 'kale', 'onions',
      'cucumber', 'corn', 'peas', 'sweet potato', 'eggplant', 'cabbage', 'lettuce', 'asparagus', 'green beans', 'brussels sprouts',
      'garlic', 'salt', 'pepper', 'chili', 'herbs', 'paprika', 'cumin', 'oregano', 'basil', 'ginger',
      'cheese', 'sauce', 'lime', 'cilantro', 'green onions', 'nuts', 'sesame seeds', 'parsley', 'sour cream', 'hot sauce',
      'olives', 'pickles', 'hummus', 'guacamole', 'salsa', 'balsamic', 'dill', 'mint'
    ],
    excludedNames: [
      'chicken', 'bacon', 'fish', 'salmon', 'beef', 'turkey', 'shrimp', 'pork', 'lamb', 'tuna', 'sausage', 'ham', 'crab', 'scallops'
    ]
  },
  {
    id: 'pescatarian',
    label: 'Pescatarian',
    allowedNames: [
      'rice', 'quinoa', 'beans', 'bread', 'tortilla', 'oatmeal', 'toast', 'yogurt', 'cereal', 'pancakes', 'pasta', 'noodles',
      'couscous', 'polenta', 'wraps', 'bagel', 'hash browns', 'grits', 'ramen', 'risotto',
      'tofu', 'tempeh', 'eggs', 'fish', 'salmon', 'shrimp', 'beans', 'tuna', 'crab', 'scallops', 'lentils', 'chickpeas',
      'salad greens', 'broccoli', 'spinach', 'avocado', 'tomatoes', 'bell peppers', 'carrots', 'zucchini', 'berries', 'mushrooms', 'kale', 'onions',
      'cucumber', 'corn', 'peas', 'sweet potato', 'eggplant', 'cabbage', 'lettuce', 'asparagus', 'green beans', 'brussels sprouts',
      'garlic', 'salt', 'pepper', 'chili', 'herbs', 'paprika', 'cumin', 'oregano', 'basil', 'ginger',
      'cheese', 'sauce', 'lime', 'cilantro', 'green onions', 'nuts', 'sesame seeds', 'parsley', 'sour cream', 'hot sauce',
      'olives', 'pickles', 'hummus', 'guacamole', 'salsa', 'balsamic', 'dill', 'mint'
    ],
    excludedNames: [
      'chicken', 'bacon', 'beef', 'turkey', 'pork', 'lamb', 'sausage', 'ham'
    ]
  },
  {
    id: 'gluten-free',
    label: 'Gluten-free',
    allowedNames: [
      'rice', 'quinoa', 'beans', 'tortilla', 'oatmeal', 'yogurt', 'couscous', 'polenta', 'wraps', 'hash browns', 'grits', 'risotto',
      'chicken', 'tofu', 'fish', 'eggs', 'bacon', 'salmon', 'beef', 'turkey', 'shrimp', 'beans', 'tempeh', 'pork', 'lamb', 'tuna', 'sausage', 'ham', 'lentils', 'chickpeas', 'crab', 'scallops',
      'salad greens', 'broccoli', 'spinach', 'avocado', 'tomatoes', 'bell peppers', 'carrots', 'zucchini', 'berries', 'mushrooms', 'kale', 'onions',
      'cucumber', 'corn', 'peas', 'sweet potato', 'eggplant', 'cabbage', 'lettuce', 'asparagus', 'green beans', 'brussels sprouts',
      'garlic', 'salt', 'pepper', 'chili', 'herbs', 'paprika', 'cumin', 'oregano', 'basil', 'ginger',
      'cheese', 'sauce', 'lime', 'cilantro', 'green onions', 'nuts', 'sesame seeds', 'parsley', 'sour cream', 'hot sauce',
      'olives', 'pickles', 'hummus', 'guacamole', 'salsa', 'balsamic', 'dill', 'mint'
    ],
    excludedNames: [
      'bread', 'toast', 'cereal', 'pancakes', 'pasta', 'noodles', 'bagel', 'ramen'
    ]
  },
  {
    id: 'dairy-free',
    label: 'Dairy-free',
    allowedNames: [
      'rice', 'quinoa', 'beans', 'bread', 'tortilla', 'oatmeal', 'toast', 'cereal', 'pancakes', 'pasta', 'noodles',
      'couscous', 'polenta', 'wraps', 'bagel', 'hash browns', 'grits', 'ramen', 'risotto',
      'chicken', 'tofu', 'fish', 'eggs', 'bacon', 'salmon', 'beef', 'turkey', 'shrimp', 'beans', 'tempeh', 'pork', 'lamb', 'tuna', 'sausage', 'ham', 'lentils', 'chickpeas', 'crab', 'scallops',
      'salad greens', 'broccoli', 'spinach', 'avocado', 'tomatoes', 'bell peppers', 'carrots', 'zucchini', 'berries', 'mushrooms', 'kale', 'onions',
      'cucumber', 'corn', 'peas', 'sweet potato', 'eggplant', 'cabbage', 'lettuce', 'asparagus', 'green beans', 'brussels sprouts',
      'garlic', 'salt', 'pepper', 'chili', 'herbs', 'paprika', 'cumin', 'oregano', 'basil', 'ginger',
      'sauce', 'lime', 'cilantro', 'green onions', 'nuts', 'sesame seeds', 'parsley', 'hot sauce',
      'olives', 'pickles', 'hummus', 'guacamole', 'salsa', 'balsamic', 'dill', 'mint'
    ],
    excludedNames: [
      'yogurt', 'cheese', 'sour cream'
    ]
  },
  {
    id: 'nut-free',
    label: 'Nut-free',
    allowedNames: [
      'rice', 'quinoa', 'beans', 'bread', 'tortilla', 'oatmeal', 'toast', 'yogurt', 'cereal', 'pancakes', 'pasta', 'noodles',
      'couscous', 'polenta', 'wraps', 'bagel', 'hash browns', 'grits', 'ramen', 'risotto',
      'chicken', 'tofu', 'fish', 'eggs', 'bacon', 'salmon', 'beef', 'turkey', 'shrimp', 'beans', 'tempeh', 'pork', 'lamb', 'tuna', 'sausage', 'ham', 'lentils', 'chickpeas', 'crab', 'scallops',
      'salad greens', 'broccoli', 'spinach', 'avocado', 'tomatoes', 'bell peppers', 'carrots', 'zucchini', 'berries', 'mushrooms', 'kale', 'onions',
      'cucumber', 'corn', 'peas', 'sweet potato', 'eggplant', 'cabbage', 'lettuce', 'asparagus', 'green beans', 'brussels sprouts',
      'garlic', 'salt', 'pepper', 'chili', 'herbs', 'paprika', 'cumin', 'oregano', 'basil', 'ginger',
      'cheese', 'sauce', 'lime', 'cilantro', 'green onions', 'sesame seeds', 'parsley', 'sour cream', 'hot sauce',
      'olives', 'pickles', 'hummus', 'guacamole', 'salsa', 'balsamic', 'dill', 'mint'
    ],
    excludedNames: [
      'nuts'
    ]
  },
  {
    id: 'halal',
    label: 'Halal',
    allowedNames: [
      'rice', 'quinoa', 'beans', 'bread', 'tortilla', 'oatmeal', 'toast', 'yogurt', 'cereal', 'pancakes', 'pasta', 'noodles',
      'couscous', 'polenta', 'wraps', 'bagel', 'hash browns', 'grits', 'ramen', 'risotto',
      'chicken', 'tofu', 'fish', 'eggs', 'salmon', 'beef', 'turkey', 'shrimp', 'beans', 'tempeh', 'lamb', 'tuna', 'lentils', 'chickpeas', 'crab', 'scallops',
      'salad greens', 'broccoli', 'spinach', 'avocado', 'tomatoes', 'bell peppers', 'carrots', 'zucchini', 'berries', 'mushrooms', 'kale', 'onions',
      'cucumber', 'corn', 'peas', 'sweet potato', 'eggplant', 'cabbage', 'lettuce', 'asparagus', 'green beans', 'brussels sprouts',
      'garlic', 'salt', 'pepper', 'chili', 'herbs', 'paprika', 'cumin', 'oregano', 'basil', 'ginger',
      'cheese', 'sauce', 'lime', 'cilantro', 'green onions', 'nuts', 'sesame seeds', 'parsley', 'sour cream', 'hot sauce',
      'olives', 'pickles', 'hummus', 'guacamole', 'salsa', 'balsamic', 'dill', 'mint'
    ],
    excludedNames: [
      'pork', 'bacon', 'sausage', 'ham'
    ]
  },
  {
    id: 'kosher',
    label: 'Kosher',
    allowedNames: [
      'rice', 'quinoa', 'beans', 'bread', 'tortilla', 'oatmeal', 'toast', 'yogurt', 'cereal', 'pancakes', 'pasta', 'noodles',
      'couscous', 'polenta', 'wraps', 'bagel', 'hash browns', 'grits', 'ramen', 'risotto',
      'chicken', 'tofu', 'fish', 'eggs', 'salmon', 'beef', 'turkey', 'beans', 'tempeh', 'lamb', 'tuna', 'lentils', 'chickpeas',
      'salad greens', 'broccoli', 'spinach', 'avocado', 'tomatoes', 'bell peppers', 'carrots', 'zucchini', 'berries', 'mushrooms', 'kale', 'onions',
      'cucumber', 'corn', 'peas', 'sweet potato', 'eggplant', 'cabbage', 'lettuce', 'asparagus', 'green beans', 'brussels sprouts',
      'garlic', 'salt', 'pepper', 'chili', 'herbs', 'paprika', 'cumin', 'oregano', 'basil', 'ginger',
      'cheese', 'sauce', 'lime', 'cilantro', 'green onions', 'nuts', 'sesame seeds', 'parsley', 'sour cream', 'hot sauce',
      'olives', 'pickles', 'hummus', 'guacamole', 'salsa', 'balsamic', 'dill', 'mint'
    ],
    excludedNames: [
      'pork', 'bacon', 'shrimp', 'crab', 'scallops', 'sausage', 'ham'
    ]
  },
  {
    id: 'low-carb',
    label: 'Low-carb',
    allowedNames: [
      'quinoa', 'beans', 'tortilla', 'wraps',
      'chicken', 'tofu', 'fish', 'eggs', 'bacon', 'salmon', 'beef', 'turkey', 'shrimp', 'beans', 'tempeh', 'pork', 'lamb', 'tuna', 'sausage', 'ham', 'lentils', 'chickpeas', 'crab', 'scallops',
      'salad greens', 'broccoli', 'spinach', 'avocado', 'tomatoes', 'bell peppers', 'carrots', 'zucchini', 'berries', 'mushrooms', 'kale', 'onions',
      'cucumber', 'lettuce', 'asparagus', 'green beans', 'brussels sprouts',
      'garlic', 'salt', 'pepper', 'chili', 'herbs', 'paprika', 'cumin', 'oregano', 'basil', 'ginger',
      'cheese', 'sauce', 'lime', 'cilantro', 'green onions', 'nuts', 'sesame seeds', 'parsley', 'sour cream', 'hot sauce',
      'olives', 'pickles', 'hummus', 'guacamole', 'salsa', 'balsamic', 'dill', 'mint'
    ],
    excludedNames: [
      'rice', 'bread', 'oatmeal', 'toast', 'yogurt', 'cereal', 'pancakes', 'pasta', 'noodles', 'couscous', 'polenta', 'bagel', 'hash browns', 'grits', 'ramen', 'risotto',
      'corn', 'peas', 'sweet potato'
    ]
  },
  {
    id: 'keto',
    label: 'Keto',
    allowedNames: [
      'chicken', 'fish', 'eggs', 'bacon', 'salmon', 'beef', 'turkey', 'shrimp', 'pork', 'lamb', 'tuna', 'sausage', 'ham', 'crab', 'scallops',
      'salad greens', 'broccoli', 'spinach', 'avocado', 'tomatoes', 'bell peppers', 'zucchini', 'berries', 'mushrooms', 'kale', 'onions',
      'cucumber', 'lettuce', 'asparagus', 'green beans', 'brussels sprouts', 'cabbage',
      'garlic', 'salt', 'pepper', 'chili', 'herbs', 'paprika', 'cumin', 'oregano', 'basil', 'ginger',
      'cheese', 'sauce', 'lime', 'cilantro', 'green onions', 'nuts', 'sesame seeds', 'parsley', 'sour cream', 'hot sauce',
      'olives', 'pickles', 'guacamole', 'salsa', 'balsamic', 'dill', 'mint'
    ],
    excludedNames: [
      'rice', 'quinoa', 'bread', 'tortilla', 'oatmeal', 'toast', 'cereal', 'pancakes', 'pasta', 'noodles', 'couscous', 'polenta', 'wraps', 'bagel', 'hash browns', 'grits', 'ramen', 'risotto',
      'beans', 'lentils', 'chickpeas', 'tofu', 'tempeh',
      'yogurt', 'corn', 'peas', 'sweet potato', 'carrots'
    ]
  },
  {
    id: 'paleo',
    label: 'Paleo',
    allowedNames: [
      'chicken', 'fish', 'eggs', 'bacon', 'salmon', 'beef', 'turkey', 'shrimp', 'pork', 'lamb', 'tuna', 'sausage', 'ham', 'crab', 'scallops',
      'salad greens', 'broccoli', 'spinach', 'avocado', 'tomatoes', 'bell peppers', 'carrots', 'zucchini', 'berries', 'mushrooms', 'kale', 'onions',
      'cucumber', 'corn', 'peas', 'sweet potato', 'eggplant', 'cabbage', 'lettuce', 'asparagus', 'green beans', 'brussels sprouts',
      'garlic', 'salt', 'pepper', 'chili', 'herbs', 'paprika', 'cumin', 'oregano', 'basil', 'ginger',
      'sauce', 'lime', 'cilantro', 'green onions', 'nuts', 'sesame seeds', 'parsley', 'hot sauce',
      'olives', 'pickles', 'guacamole', 'salsa', 'balsamic', 'dill', 'mint'
    ],
    excludedNames: [
      'rice', 'quinoa', 'bread', 'tortilla', 'oatmeal', 'toast', 'cereal', 'pancakes', 'pasta', 'noodles', 'couscous', 'polenta', 'wraps', 'bagel', 'hash browns', 'grits', 'ramen', 'risotto',
      'beans', 'lentils', 'chickpeas', 'tofu', 'tempeh',
      'yogurt', 'cheese', 'sour cream', 'hummus'
    ]
  },
  {
    id: 'shellfish-allergy',
    label: 'Shellfish allergy',
    allowedNames: [
      'rice', 'quinoa', 'beans', 'bread', 'tortilla', 'oatmeal', 'toast', 'yogurt', 'cereal', 'pancakes', 'pasta', 'noodles',
      'couscous', 'polenta', 'wraps', 'bagel', 'hash browns', 'grits', 'ramen', 'risotto',
      'chicken', 'tofu', 'fish', 'eggs', 'bacon', 'salmon', 'beef', 'turkey', 'beans', 'tempeh', 'pork', 'lamb', 'tuna', 'sausage', 'ham', 'lentils', 'chickpeas',
      'salad greens', 'broccoli', 'spinach', 'avocado', 'tomatoes', 'bell peppers', 'carrots', 'zucchini', 'berries', 'mushrooms', 'kale', 'onions',
      'cucumber', 'corn', 'peas', 'sweet potato', 'eggplant', 'cabbage', 'lettuce', 'asparagus', 'green beans', 'brussels sprouts',
      'garlic', 'salt', 'pepper', 'chili', 'herbs', 'paprika', 'cumin', 'oregano', 'basil', 'ginger',
      'cheese', 'sauce', 'lime', 'cilantro', 'green onions', 'nuts', 'sesame seeds', 'parsley', 'sour cream', 'hot sauce',
      'olives', 'pickles', 'hummus', 'guacamole', 'salsa', 'balsamic', 'dill', 'mint'
    ],
    excludedNames: [
      'shrimp', 'crab', 'scallops', 'lobster', 'clams', 'mussels', 'oysters'
    ]
  }
]

/** Get food names to select for Favorites when applying a diet (allowed foods) */
export function getAllowedFoodNames (dietId: string): string[] {
  const diet = DIETS.find(d => d.id === dietId)
  return diet ? diet.allowedNames.map(normalize) : []
}

/** Get food names to select for Dislikes/Not Today when applying a diet (excluded foods) */
export function getExcludedFoodNames (dietId: string): string[] {
  const diet = DIETS.find(d => d.id === dietId)
  return diet ? diet.excludedNames.map(normalize) : []
}

/** Return IDs of foods whose name is in the given set (normalized) */
export function getFoodIdsByNames (foods: { id: string; name: string }[], namesNormalized: string[]): string[] {
  const set = new Set(namesNormalized)
  return foods.filter(f => set.has(normalize(f.name))).map(f => f.id)
}
