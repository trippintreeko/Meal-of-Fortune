/**
 * Picks a food asset to use as a profile avatar based on a stable seed (e.g. user id, friend_id).
 * Same seed always returns the same asset so avatars are consistent.
 * Profile can also store a chosen key in avatar_url as "food:key".
 */
import type { ImageSourcePropType } from 'react-native'
import type { FoodAssetKey } from './food-asset-mapping'
import { getFoodAssetSource } from './food-asset-registry'

export const FOOD_AVATAR_PREFIX = 'food:'

export const AVATAR_KEYS: FoodAssetKey[] = [
  'rice', 'ramen', 'bread', 'chicken', 'beef', 'fish', 'tofu', 'burger',
  'sushiBasic', 'pierogi', 'soup', 'dumplings', 'poke_bowl', 'lasagna',
  'avacado', 'vegetables', 'cheese', 'salad', 'hummus_bowl',
  'hardshell_taco', 'naan', 'sandwich_of_chicken', 'bowl_of_curry', 'calzones'
]

const KEYS = AVATAR_KEYS

function hashSeed (seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function isFoodAvatarUrl (avatarUrl: string | null | undefined): boolean {
  return !!avatarUrl && avatarUrl.startsWith(FOOD_AVATAR_PREFIX)
}

export function getFoodAvatarKey (avatarUrl: string | null | undefined): FoodAssetKey | null {
  if (!avatarUrl || !avatarUrl.startsWith(FOOD_AVATAR_PREFIX)) return null
  const key = avatarUrl.slice(FOOD_AVATAR_PREFIX.length).trim()
  return AVATAR_KEYS.includes(key as FoodAssetKey) ? (key as FoodAssetKey) : null
}

/**
 * Returns the image source for a specific food avatar key (e.g. when user chose one).
 */
export function getAvatarFoodAssetSourceByKey (key: FoodAssetKey): ImageSourcePropType {
  return getFoodAssetSource(key)
}

/**
 * Returns the image source for a profile avatar. Use the same seed (e.g. auth_id or friend_id)
 * so the same user always gets the same food avatar.
 */
export function getAvatarFoodAssetSource (seed: string): ImageSourcePropType {
  const key = KEYS[hashSeed(seed) % KEYS.length]
  return getFoodAssetSource(key)
}
