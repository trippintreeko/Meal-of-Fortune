/**
 * Local food asset registry for minigames.
 * Copy your PNGs to assets/food/ with the exact filenames (e.g. rice.png, chicken.png).
 * Uncomment the require() lines below as you add each file. Until then, the fallback
 * (small placeholder image) is used so the app builds and runs.
 */
import type { ImageSourcePropType } from 'react-native'
import type { FoodAssetKey } from './food-asset-mapping'

/** 1x1 transparent PNG – used when an asset file is not yet added. */
const FALLBACK_DATA_URI: ImageSourcePropType = {
  uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
}

/**
 * Asset keys point to PNGs in assets/food/. Filenames must match exactly (case-sensitive on some systems).
 */
const REGISTRY: Partial<Record<FoodAssetKey, ImageSourcePropType>> = {
  rice: require('@/assets/food/Bowl of Rice_quinoa_oatmeal_grits_risotto_polenta.png'),
  noodle_macoronia: require('@/assets/food/noodle_macoronia.png'),
  green_noodles: require('@/assets/food/green_noodles.png'),
  ramen: require('@/assets/food/Ramen.png'),
  bread: require('@/assets/food/bread.png'),
  beans: require('@/assets/food/Dal_Makhani.png'),
  oatmeal: require('@/assets/food/Bowl of Rice_quinoa_oatmeal_grits_risotto_polenta.png'),
  sushiBasic: require('@/assets/food/sushiBasic.png'),
  pierogi: require('@/assets/food/pierogi.png'),
  soup: require('@/assets/food/bowl_of_soup.png'),
  bag_of_stuff: require('@/assets/food/Bag_of_stuff.png'),
  chicken: require('@/assets/food/chicken.png'),
  beef: require('@/assets/food/raw_beef.png'),
  beefStew: require('@/assets/food/beefStew.png'),
  fish: require('@/assets/food/fish.png'),
  salmon: require('@/assets/food/fish.png'),
  shrimp: require('@/assets/food/ShellFish.png'),
  tofu: require('@/assets/food/tofu.png'),
  bacon: require('@/assets/food/bacon.png'),
  eggs: require('@/assets/food/waffles.png'),
  sausage: require('@/assets/food/sausage.png'),
  vegetables: require('@/assets/food/vegetables.png'),
  avacado: require('@/assets/food/avacado.png'),
  broccoli: require('@/assets/food/vegetables.png'),
  salad: require('@/assets/food/cabage.png'),
  cheese: require('@/assets/food/cheese.png'),
  seafood: require('@/assets/food/seafood.png'),
  lentils: require('@/assets/food/Dal_Makhani.png'),
  tortilla: require('@/assets/food/tortilla.png'),
  grain: require('@/assets/food/Bowl of Rice_quinoa_oatmeal_grits_risotto_polenta.png'),
  pasta: require('@/assets/food/noodle_macoronia.png'),
  pork: require('@/assets/food/bacon.png'),
  mushroom: require('@/assets/food/vegetables.png'),
  pepper: require('@/assets/food/vegetables.png'),
  corn: require('@/assets/food/vegetables.png'),
  onion: require('@/assets/food/greenOnions.png'),
  beef_bulgogi_bowl: require('@/assets/food/Beef_Bulgogi_Bowl.png'),
  better_somosas: require('@/assets/food/betterSomosas.png'),
  bettersuishi: require('@/assets/food/bettersuishi.png'),
  bowl_of_curry: require('@/assets/food/bowl_of_curry.png'),
  bread_balls_potatos: require('@/assets/food/bread_balls.png'),
  burger: require('@/assets/food/burger.png'),
  cabbage: require('@/assets/food/cabage.png'),
  calzones: require('@/assets/food/calzones.png'),
  chicken_noodle_soup: require('@/assets/food/chicken_noodle_soup.png'),
  clam_chowder: require('@/assets/food/clam_chowder.png'),
  corn_chowder: require('@/assets/food/Corn_Chowder.png'),
  crossants: require('@/assets/food/crossants.png'),
  dumplings: require('@/assets/food/dumpllngs.png'),
  empanadas: require('@/assets/food/Empanadas.png'),
  falafal: require('@/assets/food/falafal.png'),
  hardshell_taco: require('@/assets/food/hardshelltaco.png'),
  hummus_bowl: require('@/assets/food/hummusBowl.png'),
  jambaliah: require('@/assets/food/jambaliah.png'),
  lasagna: require('@/assets/food/Lasagna.png'),
  naan: require('@/assets/food/naan.png'),
  poke_bowl: require('@/assets/food/poke_bowl.png'),
  pupusas: require('@/assets/food/pupusas.png'),
  raw_meat: require('@/assets/food/rawMeat.png'),
  samosas: require('@/assets/food/samosas.png'),
  sandwich_of_chicken: require('@/assets/food/sandwich_of_chicken.png'),
  shell_fish: require('@/assets/food/ShellFish.png'),
  softshell_taco: require('@/assets/food/softshelltaco.png'),
  spring_rolls: require('@/assets/food/spring_rolls.png'),
  tamales: require('@/assets/food/Tamales.png'),
  tempeh: require('@/assets/food/tempeh.png'),
  turkey: require('@/assets/food/Turkey.png'),
  type_of_noodle: require('@/assets/food/type_of_noodle.png'),
  zuchini: require('@/assets/food/zuchini.png')
}

/**
 * Returns the image source for a food asset key.
 * Use after getFoodAsset(foodId, name, category) from food-asset-mapping.
 * If the asset is not in the registry, returns a small placeholder so the app doesn't crash.
 */
export function getFoodAssetSource (key: FoodAssetKey): ImageSourcePropType {
  return REGISTRY[key] ?? FALLBACK_DATA_URI
}
