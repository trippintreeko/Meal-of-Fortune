/**
 * Expands user ingredient searches so related items appear (e.g. "nuts" → cashews, almonds).
 * When a group activates, matching uses expanded terms + triggers only — not a loose substring
 * of the query — so short queries like "nut" do not match unrelated words (e.g. coconut).
 */

export type IngredientSearchGroup = {
  id: string
  /** User text matching any trigger activates the group (prefix / substring / equality). */
  triggers: string[]
  /** Substrings to match in ingredient names when this group is active. */
  relatedTerms: string[]
}

export const INGREDIENT_SEARCH_GROUPS: IngredientSearchGroup[] = [
  {
    id: 'nuts',
    triggers: ['nuts', 'tree nut', 'tree nuts', 'peanut', 'peanuts', 'mixed nut', 'mixed nuts', 'nut butter'],
    relatedTerms: [
      'cashew', 'cashews', 'almond', 'almonds', 'walnut', 'walnuts', 'pecan', 'pecans',
      'pistachio', 'pistachios', 'hazelnut', 'hazelnuts', 'macadamia', 'macadamias',
      'brazil nut', 'brazil nuts', 'pine nut', 'pine nuts', 'chestnut', 'chestnuts',
      'acorn', 'marcona'
    ]
  },
  {
    id: 'dairy',
    triggers: ['dairy', 'milk', 'cheese', 'cream', 'yogurt', 'yoghurt', 'butter', 'lactose'],
    relatedTerms: [
      'milk', 'cream', 'butter', 'cheese', 'yogurt', 'yoghurt', 'cheddar', 'mozzarella',
      'parmesan', 'ricotta', 'feta', 'gouda', 'brie', 'swiss cheese', 'cottage cheese',
      'sour cream', 'heavy cream', 'half and half', 'whey', 'ghee', 'buttermilk',
      'ice cream', 'custard', 'mascarpone', 'creme fraiche', 'lactose'
    ]
  },
  {
    id: 'shellfish',
    triggers: ['shellfish', 'shell fish', 'crustacean', 'mollusk', 'mollusc'],
    relatedTerms: [
      'shrimp', 'prawn', 'prawns', 'crab', 'lobster', 'crayfish', 'crawfish', 'scallop',
      'scallops', 'mussel', 'mussels', 'oyster', 'oysters', 'clam', 'clams', 'squid',
      'calamari', 'octopus', 'abalone', 'langoustine'
    ]
  },
  {
    id: 'fish',
    triggers: ['fish', 'seafood', 'fin fish'],
    relatedTerms: [
      'salmon', 'tuna', 'cod', 'halibut', 'tilapia', 'mackerel', 'sardine', 'sardines',
      'anchovy', 'anchovies', 'trout', 'bass', 'snapper', 'grouper', 'haddock', 'sole',
      'flounder', 'perch', 'pike', 'carp', 'eel', 'swordfish', 'marlin', 'mahi',
      'catfish', 'pollock', 'whitefish', 'smoked salmon', 'lox'
    ]
  },
  {
    id: 'citrus',
    triggers: ['citrus'],
    relatedTerms: [
      'lemon', 'lime', 'orange', 'grapefruit', 'clementine', 'mandarin', 'tangerine',
      'bergamot', 'yuzu', 'kumquat', 'citron', 'pomelo'
    ]
  },
  {
    id: 'berries',
    triggers: ['berries', 'berry'],
    relatedTerms: [
      'strawberry', 'strawberries', 'blueberry', 'blueberries', 'raspberry', 'raspberries',
      'blackberry', 'blackberries', 'cranberry', 'cranberries', 'gooseberry', 'elderberry',
      'boysenberry', 'mulberry', 'huckleberry', 'acai', 'currant'
    ]
  },
  {
    id: 'onion_family',
    triggers: ['onion', 'onions', 'allium'],
    relatedTerms: [
      'onion', 'onions', 'shallot', 'shallots', 'scallion', 'scallions', 'green onion',
      'leek', 'leeks', 'chive', 'chives', 'garlic', 'ramps'
    ]
  },
  {
    id: 'peppers',
    triggers: ['pepper', 'peppers', 'chile', 'chili', 'chilli'],
    relatedTerms: [
      'jalapeno', 'jalapeño', 'habanero', 'serrano', 'poblano', 'anaheim', 'bell pepper',
      'cayenne', 'chipotle', 'paprika', 'capsicum', 'bird eye', 'scotch bonnet'
    ]
  },
  {
    id: 'mushrooms',
    triggers: ['mushroom', 'mushrooms', 'fungi'],
    relatedTerms: [
      'shiitake', 'portobello', 'portabella', 'cremini', 'button mushroom', 'oyster mushroom',
      'enoki', 'chanterelle', 'morel', 'porcini', 'truffle', 'maitake'
    ]
  },
  {
    id: 'legumes',
    triggers: ['legume', 'legumes', 'beans', 'pulses'],
    relatedTerms: [
      'bean', 'beans', 'lentil', 'lentils', 'chickpea', 'chickpeas', 'garbanzo',
      'black bean', 'kidney bean', 'pinto', 'navy bean', 'lima bean', 'fava',
      'split pea', 'edamame', 'soybean', 'soybeans', 'adzuki', 'mung bean'
    ]
  },
  {
    id: 'grains',
    triggers: ['grain', 'grains', 'cereal', 'wheat', 'gluten'],
    relatedTerms: [
      'rice', 'wheat', 'barley', 'oats', 'oat', 'rye', 'quinoa', 'bulgur', 'couscous',
      'farro', 'millet', 'sorghum', 'buckwheat', 'corn', 'maize', 'polenta', 'semolina',
      'flour', 'pasta', 'bread', 'gluten'
    ]
  },
  {
    id: 'herbs',
    triggers: ['herb', 'herbs', 'fresh herbs'],
    relatedTerms: [
      'basil', 'oregano', 'thyme', 'rosemary', 'sage', 'parsley', 'cilantro', 'coriander',
      'dill', 'mint', 'tarragon', 'marjoram', 'bay leaf', 'chervil', 'lovage'
    ]
  },
  {
    id: 'fruits',
    triggers: ['fruit', 'fruits', 'fresh fruit', 'tropical fruit'],
    relatedTerms: [
      'apple', 'apples', 'banana', 'bananas', 'mango', 'mangoes', 'peach', 'peaches',
      'pear', 'pears', 'plum', 'plums', 'grape', 'grapes', 'cherry', 'cherries',
      'apricot', 'apricots', 'nectarine', 'nectarines', 'persimmon', 'fig', 'figs',
      'date', 'dates', 'prune', 'prunes', 'raisin', 'raisins',
      'pineapple', 'papaya', 'guava', 'lychee', 'longan', 'dragon fruit', 'passion fruit',
      'kiwi', 'coconut', 'plantain', 'jackfruit', 'durian', 'starfruit',
      'melon', 'watermelon', 'honeydew', 'cantaloupe', 'muskmelon',
      'pomegranate', 'quince', 'rhubarb'
    ]
  },
  {
    id: 'vegetables',
    triggers: ['vegetable', 'vegetables', 'veggie', 'veggies', 'veg', 'greens'],
    relatedTerms: [
      'tomato', 'tomatoes', 'carrot', 'carrots', 'celery', 'cucumber', 'cucumbers',
      'zucchini', 'squash', 'pumpkin', 'broccoli', 'cauliflower', 'cabbage', 'brussels sprout',
      'kale', 'spinach', 'lettuce', 'arugula', 'romaine', 'chard', 'collard',
      'radish', 'radishes', 'turnip', 'turnips', 'rutabaga', 'parsnip', 'parsnips',
      'beet', 'beets', 'potato', 'potatoes', 'yam', 'yams', 'jicama', 'kohlrabi',
      'corn', 'peas', 'snow pea', 'snap pea', 'edamame', 'asparagus', 'artichoke', 'artichokes',
      'eggplant', 'okra', 'fennel', 'bok choy', 'napa cabbage', 'bean sprout', 'bamboo shoot',
      'watercress', 'endive', 'escarole', 'frisee', 'mizuna', 'tatsoi', 'celeriac',
      'leek', 'scallion', 'green bean', 'wax bean', 'sunchoke', 'daikon'
    ]
  }
]

function triggerMatchesQuery (q: string, trigger: string): boolean {
  const ql = q.trim().toLowerCase()
  const tl = trigger.toLowerCase().trim()
  if (ql.length < 2) return false
  if (ql === tl) return true
  if (tl.includes(ql) || ql.includes(tl)) return true
  if (tl.startsWith(ql) || ql.startsWith(tl)) return true
  return false
}

export type IngredientSearchMatchMode = 'literal' | 'expanded'

export type IngredientSearchMatchTerms = {
  terms: string[]
  mode: IngredientSearchMatchMode
  /** Group ids that contributed expansion (for debugging / future UI). */
  activatedGroupIds: string[]
}

/**
 * Builds the term set used to match ingredient display names and member names.
 * - Literal: single term = normalized user query (substring match).
 * - Expanded: all related terms + triggers from matched groups (no bare short query alone).
 */
export function getIngredientSearchMatchTerms (rawQuery: string): IngredientSearchMatchTerms {
  const q = rawQuery.trim().toLowerCase()
  if (!q) {
    return { terms: [], mode: 'literal', activatedGroupIds: [] }
  }

  const activated = INGREDIENT_SEARCH_GROUPS.filter((g) =>
    g.triggers.some((t) => triggerMatchesQuery(q, t))
  )

  if (activated.length === 0) {
    return { terms: [q], mode: 'literal', activatedGroupIds: [] }
  }

  const terms = new Set<string>()
  for (const g of activated) {
    for (const t of g.relatedTerms) terms.add(t.toLowerCase())
    for (const t of g.triggers) terms.add(t.toLowerCase())
  }
  return {
    terms: [...terms],
    mode: 'expanded',
    activatedGroupIds: activated.map((g) => g.id)
  }
}

/** True if any term appears as a substring of the haystack (lowercase). */
export function haystackMatchesAnyTerm (haystack: string, terms: string[]): boolean {
  const h = haystack.toLowerCase()
  return terms.some((t) => t.length > 0 && h.includes(t))
}
