/**
 * "What kind of feeling are you in the mood for?" options.
 * Used on the feeling screen before starting game rounds.
 * Can later drive filtering/sorting by food mood tags.
 */

export type FeelingOption = {
  id: string
  label: string
  description: string
  /** Lucide icon name for visual; optional. */
  icon?: string
  color?: string
}

export const FEELINGS: FeelingOption[] = [
  {
    id: 'warm_me_up',
    label: 'Warm me up',
    description: 'Something to heat you up after the cold',
    color: '#f97316'
  },
  {
    id: 'cool_me_off',
    label: 'Cool me off',
    description: 'Refreshing after a hot day',
    color: '#0ea5e9'
  },
  {
    id: 'light',
    label: 'Light',
    description: 'Easy on the stomach, not too filling',
    color: '#94a3b8'
  },
  {
    id: 'heavy',
    label: 'Heavy & hearty',
    description: 'Stick-to-your-ribs, satisfying',
    color: '#78350f'
  },
  {
    id: 'hearty',
    label: 'Hearty',
    description: 'Filling and comforting',
    color: '#b45309'
  },
  {
    id: 'earthy',
    label: 'Earthy',
    description: 'Grounding, natural, wholesome',
    color: '#65a30d'
  },
  {
    id: 'cleansing',
    label: 'Cleansing',
    description: 'Fresh, clean, feel-good',
    color: '#10b981'
  },
  {
    id: 'rejuvenating',
    label: 'Rejuvenating',
    description: 'Revive and recharge',
    color: '#8b5cf6'
  },
  {
    id: 'energy_booster',
    label: 'Energy booster',
    description: 'Pick me up, fuel for the day',
    color: '#eab308'
  },
  {
    id: 'comforting',
    label: 'Comforting',
    description: 'Cozy, familiar, like a hug',
    color: '#c2410c'
  },
  {
    id: 'refreshing',
    label: 'Refreshing',
    description: 'Crisp, bright, invigorating',
    color: '#06b6d4'
  },
  {
    id: 'cozy',
    label: 'Cozy',
    description: 'Warm and snug',
    color: '#dc2626'
  },
  {
    id: 'indulgent',
    label: 'Indulgent',
    description: 'Treat yourself, a bit decadent',
    color: '#a21caf'
  },
  {
    id: 'simple',
    label: 'Simple',
    description: 'No fuss, straightforward',
    color: '#64748b'
  },
  {
    id: 'adventurous',
    label: 'Adventurous',
    description: 'Try something new and bold',
    color: '#7c3aed'
  }
]

export function getFeelingById (id: string): FeelingOption | undefined {
  return FEELINGS.find(f => f.id === id)
}

/** Gallery meal item for feeling-filtered food gallery. Params match results screen. */
export type GalleryMeal = {
  id: string
  title: string
  color: string
  base: string
  protein: string
  vegetable: string
  method: string
}

const BASE_RICE = '11111111-1111-1111-1111-111111111101'
const BASE_NOODLES = '11111111-1111-1111-1111-11111111110c'
const BASE_QUINOA = '11111111-1111-1111-1111-111111111102'
const BASE_BEANS = '11111111-1111-1111-1111-111111111103'
const BASE_oatmeal = '11111111-1111-1111-1111-111111111106'
const PROTEIN_CHICKEN = '22222222-2222-2222-2222-222222222201'
const PROTEIN_SALMON = '22222222-2222-2222-2222-222222222206'
const PROTEIN_TOFU = '22222222-2222-2222-2222-222222222202'
const PROTEIN_EGGS = '22222222-2222-2222-2222-222222222204'
const PROTEIN_BEEF = '22222222-2222-2222-2222-222222222207'
const VEG_GREENS = '33333333-3333-3333-3333-333333333301'
const VEG_BROCCOLI = '33333333-3333-3333-3333-333333333302'
const VEG_AVOCADO = '33333333-3333-3333-3333-333333333304'
const VEG_TOMATOES = '33333333-3333-3333-3333-333333333305'
const VEG_BERRIES = '33333333-3333-3333-3333-333333333309'

/** Meals to show in the gallery when a feeling is selected. Key = feeling id. */
export const FEELING_GALLERY_MEALS: Record<string, GalleryMeal[]> = {
  warm_me_up: [
    { id: '1', title: 'Steamed Rice Bowl with Chicken', color: '#f97316', base: BASE_RICE, protein: PROTEIN_CHICKEN, vegetable: VEG_BROCCOLI, method: 'steamed' },
    { id: '2', title: 'Grilled Salmon with Quinoa', color: '#ea580c', base: BASE_QUINOA, protein: PROTEIN_SALMON, vegetable: VEG_GREENS, method: 'grilled' },
    { id: '3', title: 'Baked Chicken & Rice', color: '#c2410c', base: BASE_RICE, protein: PROTEIN_CHICKEN, vegetable: VEG_TOMATOES, method: 'baked' }
  ],
  cool_me_off: [
    { id: '4', title: 'Cold Rice Bowl with Salmon', color: '#0ea5e9', base: BASE_RICE, protein: PROTEIN_SALMON, vegetable: VEG_AVOCADO, method: 'steamed' },
    { id: '5', title: 'Refreshing Salad with Tofu', color: '#06b6d4', base: VEG_GREENS, protein: PROTEIN_TOFU, vegetable: VEG_AVOCADO, method: 'steamed' },
    { id: '6', title: 'Light Quinoa & Greens', color: '#22d3ee', base: BASE_QUINOA, protein: PROTEIN_TOFU, vegetable: VEG_GREENS, method: 'steamed' }
  ],
  light: [
    { id: '7', title: 'Steamed Rice & Broccoli', color: '#94a3b8', base: BASE_RICE, protein: PROTEIN_TOFU, vegetable: VEG_BROCCOLI, method: 'steamed' },
    { id: '8', title: 'Light Tofu Bowl', color: '#cbd5e1', base: BASE_QUINOA, protein: PROTEIN_TOFU, vegetable: VEG_GREENS, method: 'steamed' },
    { id: '9', title: 'Simple Greens & Eggs', color: '#e2e8f0', base: BASE_RICE, protein: PROTEIN_EGGS, vegetable: VEG_GREENS, method: 'steamed' }
  ],
  heavy: [
    { id: '10', title: 'Hearty Beef & Rice', color: '#78350f', base: BASE_RICE, protein: PROTEIN_BEEF, vegetable: VEG_BROCCOLI, method: 'grilled' },
    { id: '11', title: 'Heavy Chicken & Beans', color: '#92400e', base: BASE_BEANS, protein: PROTEIN_CHICKEN, vegetable: VEG_TOMATOES, method: 'baked' }
  ],
  hearty: [
    { id: '12', title: 'Hearty Chicken Rice Bowl', color: '#b45309', base: BASE_RICE, protein: PROTEIN_CHICKEN, vegetable: VEG_BROCCOLI, method: 'grilled' },
    { id: '13', title: 'Beef & Quinoa Bowl', color: '#d97706', base: BASE_QUINOA, protein: PROTEIN_BEEF, vegetable: VEG_GREENS, method: 'grilled' }
  ],
  earthy: [
    { id: '14', title: 'Earthy Beans & Greens', color: '#65a30d', base: BASE_BEANS, protein: PROTEIN_TOFU, vegetable: VEG_GREENS, method: 'steamed' },
    { id: '15', title: 'Quinoa & Mushrooms', color: '#84cc16', base: BASE_QUINOA, protein: PROTEIN_TOFU, vegetable: VEG_GREENS, method: 'baked' }
  ],
  cleansing: [
    { id: '16', title: 'Clean Greens & Tofu', color: '#10b981', base: BASE_QUINOA, protein: PROTEIN_TOFU, vegetable: VEG_BROCCOLI, method: 'steamed' },
    { id: '17', title: 'Fresh Quinoa Bowl', color: '#14b8a6', base: BASE_QUINOA, protein: PROTEIN_SALMON, vegetable: VEG_AVOCADO, method: 'steamed' }
  ],
  rejuvenating: [
    { id: '18', title: 'Salmon & Greens Bowl', color: '#8b5cf6', base: BASE_RICE, protein: PROTEIN_SALMON, vegetable: VEG_GREENS, method: 'steamed' },
    { id: '19', title: 'Tofu & Berry Bowl', color: '#a78bfa', base: BASE_oatmeal, protein: PROTEIN_TOFU, vegetable: VEG_BERRIES, method: 'steamed' }
  ],
  energy_booster: [
    { id: '20', title: 'Chicken & Rice Power Bowl', color: '#eab308', base: BASE_RICE, protein: PROTEIN_CHICKEN, vegetable: VEG_BROCCOLI, method: 'grilled' },
    { id: '21', title: 'Eggs & Greens', color: '#facc15', base: BASE_RICE, protein: PROTEIN_EGGS, vegetable: VEG_TOMATOES, method: 'grilled' }
  ],
  comforting: [
    { id: '22', title: 'Cozy Chicken Rice', color: '#c2410c', base: BASE_RICE, protein: PROTEIN_CHICKEN, vegetable: VEG_TOMATOES, method: 'baked' },
    { id: '23', title: 'Beef & Rice Bowl', color: '#ea580c', base: BASE_RICE, protein: PROTEIN_BEEF, vegetable: VEG_BROCCOLI, method: 'grilled' }
  ],
  refreshing: [
    { id: '24', title: 'Refreshing Salmon Bowl', color: '#06b6d4', base: BASE_RICE, protein: PROTEIN_SALMON, vegetable: VEG_AVOCADO, method: 'steamed' },
    { id: '25', title: 'Light Tofu & Greens', color: '#22d3ee', base: BASE_QUINOA, protein: PROTEIN_TOFU, vegetable: VEG_GREENS, method: 'steamed' }
  ],
  cozy: [
    { id: '26', title: 'Warm Chicken & Rice', color: '#dc2626', base: BASE_RICE, protein: PROTEIN_CHICKEN, vegetable: VEG_BROCCOLI, method: 'baked' },
    { id: '27', title: 'Steamy Rice Bowl', color: '#ef4444', base: BASE_RICE, protein: PROTEIN_TOFU, vegetable: VEG_TOMATOES, method: 'steamed' }
  ],
  indulgent: [
    { id: '28', title: 'Grilled Steak & Rice', color: '#a21caf', base: BASE_RICE, protein: PROTEIN_BEEF, vegetable: VEG_TOMATOES, method: 'grilled' },
    { id: '29', title: 'Baked Salmon Bowl', color: '#c026d3', base: BASE_QUINOA, protein: PROTEIN_SALMON, vegetable: VEG_AVOCADO, method: 'baked' }
  ],
  simple: [
    { id: '30', title: 'Simple Rice & Chicken', color: '#64748b', base: BASE_RICE, protein: PROTEIN_CHICKEN, vegetable: VEG_GREENS, method: 'grilled' },
    { id: '31', title: 'Easy Eggs & Greens', color: '#94a3b8', base: BASE_RICE, protein: PROTEIN_EGGS, vegetable: VEG_GREENS, method: 'steamed' }
  ],
  adventurous: [
    { id: '32', title: 'Spiced Salmon & Quinoa', color: '#7c3aed', base: BASE_QUINOA, protein: PROTEIN_SALMON, vegetable: VEG_AVOCADO, method: 'grilled' },
    { id: '33', title: 'Bold Beef & Noodles', color: '#8b5cf6', base: BASE_NOODLES, protein: PROTEIN_BEEF, vegetable: VEG_BROCCOLI, method: 'fried' }
  ]
}

export function getGalleryMealsForFeeling (feelingId: string | null | undefined): GalleryMeal[] {
  if (feelingId == null || feelingId === '') return []
  return FEELING_GALLERY_MEALS[feelingId] ?? []
}
