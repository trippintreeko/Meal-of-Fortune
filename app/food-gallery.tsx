import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  ScrollView,
  Dimensions,
  Image,
  Alert,
  ActivityIndicator
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system/legacy'
import { ChevronLeft, ChevronDown, Heart, Search, List, LayoutGrid, X, Camera } from 'lucide-react-native'
import { useThemeColors } from '@/hooks/useTheme'
import { useSystemBack } from '@/hooks/useSystemBack'
import { getGalleryMealsForFeeling, getFeelingById } from '@/lib/feelings'
import { useCalendarStore } from '@/store/calendar-store'
import { useFoodPreferencesStore } from '@/store/food-preferences-store'
import { useMealPhotosStore } from '@/store/meal-photos-store'
import { supabase } from '@/lib/supabase'
import { getBestRecipeImageUrlForViewing, mergeRecipeAndStoredImageUrls } from '@/lib/spoonacular-images'
import { MealImageFullscreenViewer } from '@/components/MealImageFullscreenViewer'
import SwipeCard from '@/components/SwipeCard'
import { formatRecipeTitle } from '@/lib/format'
import { getMethodDisplayPast } from '@/lib/cooking-methods'
import { normalizeFoodItemName } from '@/lib/diets'
import {
  fetchBlockedNamesForDislikesAndNotToday,
  fetchRecipeIngredientNamesMap,
  mealViolatesAvoidLists,
  mergeFavoriteAppliedAllergyExcludedNames,
  preferenceIdsForAvoidCheck
} from '@/lib/meal-avoid-lists'
import {
  GALLERY_CATEGORY_LABELS,
  compareGalleryCategoryKeys,
  getGalleryFilterTags,
  getGalleryShapeCategory,
  ingredientNamesMatchFoodName,
  mealMatchesGalleryCategory
} from '@/lib/gallery-food-tags'
import type { GalleryMeal } from '@/lib/feelings'
import type { SavedMeal } from '@/types/calendar'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')
const PAD = 16
const GAP = 10
/** Random swipe deck size when browsing by feeling (matches minigame results style). */
const FEELING_SWIPE_DECK_SIZE = 25

type ViewMode = 'list' | 'big' | 'small'

type RecipeDetail = {
  image_url: string
  title?: string | null
  servings?: number | null
  instructions?: string | null
  cuisine?: string | null
}

type ExplorerMeal = GalleryMeal & {
  description?: string
  baseGroup?: string
  /** breakfast | lunch | dinner | any — from gallery_meals.meal_type */
  mealType?: string
  /** Pre-fetched image URLs: recipe image first (when matched), then gallery image_urls */
  imageUrls?: string[]
  /** Spoonacular ingredient ids for the matched recipe (for filtering/preferences). */
  ingredientIds?: string[]
  /** Normalized names from recipe_ingredients — drives gallery categories & diets */
  ingredientNamesNormalized?: string[]
  spoonacular_recipe_id?: number | null
  recipeDetail?: RecipeDetail | null
  /** Primary cuisine from Spoonacular (display / metadata, not used for food-type filter) */
  cuisine?: string | null
  /** Feeling vibe ids (used to group meals by "How are you feeling?" options) */
  feelingIds?: string[]
}

const BASE_GROUP_COLORS: Record<string, string> = {
  rice: '#f59e0b',
  noodles: '#8b5cf6',
  quinoa: '#22c55e',
  tortilla: '#f97316',
  bread: '#eab308',
  toast: '#ca8a04',
  pasta: '#06b6d4',
  breakfast: '#ec4899',
  potato: '#a16207',
  corn: '#eab308',
  pizza: '#dc2626',
  dough: '#b45309',
  legume: '#65a30d',
  plant: '#10b981',
  fermented: '#7c3aed',
  seaweed: '#0d9488',
  seed: '#84cc16',
  soup: '#0ea5e9',
  salad: '#14b8a6',
  sushi: '#ef4444',
  dessert: '#d946ef',
  any: '#64748b',
  featured: '#8b5cf6'
}

const FEELING_ORDER = [
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
  'indulgent',
  'adventurous'
]

function normalizeFeelingIdList (value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((id) => (typeof id === 'string' ? id.trim() : ''))
    .filter(Boolean)
}

function pickPrimaryFeelingId (feelingIds: string[]): string | null {
  if (feelingIds.length === 0) return null
  for (const id of FEELING_ORDER) {
    if (feelingIds.includes(id)) return id
  }
  return feelingIds[0] ?? null
}

/** Same logic as feeling-filtered gallery: primary vibe color first, then base-group accent. */
function resolveGalleryMealCardColor (feelingIdsRaw: unknown, baseGroup: string | null): string {
  const feelingIds = normalizeFeelingIdList(feelingIdsRaw)
  const primaryFeelingId = pickPrimaryFeelingId(feelingIds)
  const feelingColor = primaryFeelingId ? getFeelingById(primaryFeelingId)?.color : undefined
  if (feelingColor) return feelingColor
  return BASE_GROUP_COLORS[baseGroup ?? 'any'] ?? BASE_GROUP_COLORS.any
}

/** Fetch Spoonacular recipe details (image, title, servings, instructions, cuisine) for the given recipe ids. */
async function fetchRecipeDetailsMap (recipeIds: number[]): Promise<Map<number, RecipeDetail>> {
  const unique = [...new Set(recipeIds)].filter((id): id is number => id != null && Number.isInteger(id))
  if (unique.length === 0) return new Map()
  const { data, error } = await supabase
    .from('spoonacular_recipe_details')
    .select('spoonacular_recipe_id, image_url, title, servings, instructions, cuisine')
    .in('spoonacular_recipe_id', unique)
  if (error || !data) return new Map()
  const map = new Map<number, RecipeDetail>()
  for (const row of data as Array<{ spoonacular_recipe_id: number, image_url: string | null, title: string | null, servings: number | null, instructions: string | null, cuisine: string | null }>) {
    if (row.image_url) {
      map.set(row.spoonacular_recipe_id, {
        image_url: row.image_url,
        title: row.title ?? undefined,
        servings: row.servings ?? undefined,
        instructions: row.instructions ?? undefined,
        cuisine: row.cuisine ?? undefined
      })
    }
  }
  return map
}

/** Fetch Spoonacular ingredient ids for each recipe. */
async function fetchRecipeIngredientIdsMap (recipeIds: number[]): Promise<Map<number, string[]>> {
  const unique = [...new Set(recipeIds)].filter((id): id is number => id != null && Number.isInteger(id))
  if (unique.length === 0) return new Map()
  const { data, error } = await supabase
    .from('recipe_ingredients')
    .select('spoonacular_recipe_id, spoonacular_ingredient_id')
    .in('spoonacular_recipe_id', unique)
  if (error || !data) return new Map()

  const byRecipe = new Map<number, Set<string>>()
  for (const row of data as Array<{ spoonacular_recipe_id: number; spoonacular_ingredient_id: number | null }>) {
    if (row.spoonacular_ingredient_id == null) continue
    if (!byRecipe.has(row.spoonacular_recipe_id)) byRecipe.set(row.spoonacular_recipe_id, new Set())
    byRecipe.get(row.spoonacular_recipe_id)!.add(String(row.spoonacular_ingredient_id))
  }

  const out = new Map<number, string[]>()
  for (const [recipeId, set] of byRecipe.entries()) {
    out.set(recipeId, [...set])
  }
  return out
}

function preferenceIdsForMeal (meal: ExplorerMeal): string[] {
  return preferenceIdsForAvoidCheck(meal)
}

async function uriToDataUrl (uri: string): Promise<string | null> {
  const mime = uri.toLowerCase().includes('.png') ? 'image/png' : 'image/jpeg'
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' })
    return `data:${mime};base64,${base64}`
  } catch {
    try {
      if (FileSystem.documentDirectory) {
        const tempPath = `${FileSystem.documentDirectory}meal_photo_${Date.now()}.jpg`
        await FileSystem.copyAsync({ from: uri, to: tempPath })
        const base64 = await FileSystem.readAsStringAsync(tempPath, { encoding: 'base64' })
        await FileSystem.deleteAsync(tempPath, { idempotent: true })
        return `data:${mime};base64,${base64}`
      }
    } catch (_) {}
    return null
  }
}

const sampleImages: ExplorerMeal[] = [
  { id: '1', title: 'Fried Rice with Chicken', color: '#f59e0b', base: '', protein: '', vegetable: '', method: 'stove', baseGroup: 'rice', ingredientNamesNormalized: ['rice', 'chicken', 'soy sauce'] },
  { id: '2', title: 'Baked Salmon with Quinoa', color: '#ec4899', base: '', protein: '', vegetable: '', method: 'baked', baseGroup: 'quinoa', ingredientNamesNormalized: ['salmon', 'quinoa', 'lemon'] },
  { id: '3', title: 'Steamed Broccoli & Tofu', color: '#22c55e', base: '', protein: '', vegetable: '', method: 'steamed', baseGroup: 'any', ingredientNamesNormalized: ['broccoli', 'tofu', 'garlic'] },
  { id: '4', title: 'Grilled Steak with Potatoes', color: '#ef4444', base: '', protein: '', vegetable: '', method: 'grilled', baseGroup: 'any', ingredientNamesNormalized: ['beef', 'potato', 'butter'] },
  { id: '5', title: 'Pasta with Tomato Sauce', color: '#8b5cf6', base: '', protein: '', vegetable: '', method: 'stove', baseGroup: 'pasta', ingredientNamesNormalized: ['pasta', 'tomato', 'basil'] },
  { id: '6', title: 'Burrito Bowl', color: '#f97316', base: '', protein: '', vegetable: '', method: 'grilled', baseGroup: 'tortilla', ingredientNamesNormalized: ['rice', 'black beans', 'cheese'] }
]

function MealCard ({
  meal,
  viewMode,
  noMarginRight,
  onPress,
  onToggleWant,
  isAdded,
  userPhotoUrl
}: {
  meal: ExplorerMeal
  viewMode: ViewMode
  noMarginRight?: boolean
  onPress: () => void
  onToggleWant: () => void
  isAdded: boolean
  /** Photo the user took for this meal (when in "Meals I want" and they added a photo) */
  userPhotoUrl?: string | null
}) {
  const isList = viewMode === 'list'
  const isBig = viewMode === 'big'
  const isSmall = viewMode === 'small'
  const numCols = isList ? 1 : isBig ? 2 : 3
  const cardWidth = isList ? undefined : (SCREEN_WIDTH - PAD * 2 - GAP * (numCols - 1)) / numCols
  const cardHeight = isList ? 72 : isBig ? 140 : 96

  const thumbUrl = userPhotoUrl ?? meal.imageUrls?.[0]
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.card,
        {
          width: cardWidth,
          height: cardHeight,
          backgroundColor: meal.color,
          marginBottom: GAP,
          marginRight: isList || noMarginRight ? 0 : GAP
        }
      ]}
    >
      <View style={[styles.cardInner, isList && styles.cardInnerList]}>
        {!isList && (
          thumbUrl
            ? (
              <View style={[styles.cardImageWrap, isBig && styles.cardImageWrapBig, isSmall && styles.cardImageWrapSmall]}>
                <Image source={{ uri: thumbUrl }} style={styles.cardImage} resizeMode="cover" />
              </View>
              )
            : (
              <View style={[styles.cardEmoji, isBig && styles.cardImageWrapBig, isSmall && styles.cardImageWrapSmall, isSmall && styles.cardEmojiSmall]}>
                <Text style={styles.emojiText}>📷</Text>
              </View>
              )
        )}
        <View style={[styles.cardTextWrap, isList && styles.cardTextWrapList, !isList && styles.cardTextWrapGrid]}>
          <Text style={[styles.cardTitle, isSmall && styles.cardTitleSmall]} numberOfLines={isList ? 1 : 2}>
            {formatRecipeTitle(meal.title ?? '')}
          </Text>
        </View>
        {isList && thumbUrl && (
          <View style={styles.listThumbWrap}>
            <Image source={{ uri: thumbUrl }} style={styles.listThumb} resizeMode="cover" />
          </View>
        )}
        <TouchableOpacity
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={(e) => {
            e.stopPropagation()
            onToggleWant()
          }}
          style={[styles.heartWrap, isList && styles.heartWrapList]}
        >
          <Heart size={isSmall ? 18 : 22} color="#ffffff" fill={isAdded ? '#ffffff' : 'transparent'} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  )
}

export default function FoodGalleryScreen () {
  const router = useRouter()
  const colors = useThemeColors()
  const params = useLocalSearchParams<{ feeling?: string; food?: string; browse?: string }>()
  const feelingId = (params.feeling ?? '').trim() || null
  const foodId = (params.food ?? '').trim() || null
  const browseRaw = params.browse
  const browseParam: 'gallery' | 'swipe' =
    (Array.isArray(browseRaw) ? browseRaw[0] : browseRaw) === 'swipe' ? 'swipe' : 'gallery'

  const handleGalleryBack = useCallback(() => {
    if (feelingId != null && feelingId !== '') {
      if (router.canGoBack()) {
        router.back()
      } else {
        ;(router.replace as (href: string) => void)('/game/feeling')
      }
      return
    }
    router.back()
  }, [feelingId, router])

  const isFromFeelingFlow = feelingId != null && feelingId !== ''
  useSystemBack(handleGalleryBack, isFromFeelingFlow)

  const loadPreferences = useFoodPreferencesStore(s => s.load)
  const dislikeIds = useFoodPreferencesStore(s => s.dislikeIds)
  const notTodayIds = useFoodPreferencesStore(s => s.notTodayIds)
  const appliedFavoriteDietIds = useFoodPreferencesStore(s => s.appliedDietIds.favorite)
  const isDisliked = useFoodPreferencesStore(s => s.isDisliked)
  const isNotToday = useFoodPreferencesStore(s => s.isNotToday)
  const isFavorite = useFoodPreferencesStore(s => s.isFavorite)
  const { load: loadMealPhotos, getPhotoUrl, addPhotoOffline } = useMealPhotosStore()

  const [galleryMealsFromDb, setGalleryMealsFromDb] = useState<ExplorerMeal[]>([])
  const [feelingMealsFromDb, setFeelingMealsFromDb] = useState<ExplorerMeal[]>([])
  const [foodName, setFoodName] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('big')
  const [searchExpanded, setSearchExpanded] = useState(false)
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false)
  const [selectedMeal, setSelectedMeal] = useState<ExplorerMeal | null>(null)
  const [modalAddingPhoto, setModalAddingPhoto] = useState(false)
  /** Full-screen meal image (higher-res Spoonacular URL when applicable) */
  const [fullScreenViewerUrl, setFullScreenViewerUrl] = useState<string | null>(null)
  /** When opened with ?feeling=&browse=swipe, show results-style swipe deck (browse set from feeling screen). */
  const [feelingBrowseMode, setFeelingBrowseMode] = useState<'gallery' | 'swipe'>('gallery')
  const [feelingSwipeDeck, setFeelingSwipeDeck] = useState<ExplorerMeal[]>([])
  const [feelingSwipeStage, setFeelingSwipeStage] = useState<'swipe' | 'complete'>('swipe')
  const [feelingSwipeIndex, setFeelingSwipeIndex] = useState(0)
  const [feelingSwipeSaved, setFeelingSwipeSaved] = useState<ExplorerMeal[]>([])
  /** Dislikes + Not today + favorite-tab allergy diets (e.g. nut allergy) — matched to recipe ingredients */
  const [blockedFoodNamesNormalized, setBlockedFoodNamesNormalized] = useState<Set<string>>(() => new Set())

  const surpriseMeGlow = true

  const closeDropdownsAndSearch = () => {
    setSearchExpanded(false)
    setCategoryDropdownOpen(false)
  }

  useEffect(() => {
    loadPreferences()
  }, [loadPreferences])

  useEffect(() => {
    void loadMealPhotos()
  }, [loadMealPhotos])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const base = await fetchBlockedNamesForDislikesAndNotToday(dislikeIds, notTodayIds)
      if (cancelled) return
      setBlockedFoodNamesNormalized(mergeFavoriteAppliedAllergyExcludedNames(base, appliedFavoriteDietIds))
    })()
    return () => { cancelled = true }
  }, [dislikeIds, notTodayIds, appliedFavoriteDietIds])

  useEffect(() => {
    if (feelingId != null && feelingId !== '') return
    let cancelled = false
    async function load () {
      const { data, error } = await supabase
        .from('gallery_meals')
        .select('id, title, description, cooking_method, meal_type, base_group, image_urls, spoonacular_recipe_id, cuisine, feeling_ids')
        .order('sort_order')
      if (cancelled || error) {
        if (!cancelled && error) setGalleryMealsFromDb([])
        return
      }
      const rows = (data ?? []) as Array<{
        id: string
        title: string
        description: string | null
        cooking_method: string | null
        meal_type: string | null
        base_group: string | null
        image_urls: string[] | null
        spoonacular_recipe_id: number | null
        cuisine: string | null
        feeling_ids: string[] | null
      }>
      const recipeIds = rows.map((r) => r.spoonacular_recipe_id).filter((id): id is number => id != null)
      const [recipeMap, ingredientIdsMap, ingredientNamesMap] = await Promise.all([
        fetchRecipeDetailsMap(recipeIds),
        fetchRecipeIngredientIdsMap(recipeIds),
        fetchRecipeIngredientNamesMap(recipeIds)
      ])
      if (cancelled) return
      const mapped: ExplorerMeal[] = rows.map((row) => {
        const recipe = row.spoonacular_recipe_id != null ? recipeMap.get(row.spoonacular_recipe_id) : undefined
        const ingredientIds = row.spoonacular_recipe_id != null
          ? ingredientIdsMap.get(row.spoonacular_recipe_id) ?? []
          : []
        const ingredientNamesNormalized = row.spoonacular_recipe_id != null
          ? ingredientNamesMap.get(row.spoonacular_recipe_id) ?? []
          : []
        const existingUrls = Array.isArray(row.image_urls) ? row.image_urls : []
        const mergedUrls = mergeRecipeAndStoredImageUrls(
          recipe?.image_url,
          existingUrls,
          row.spoonacular_recipe_id
        )
        const imageUrls = mergedUrls.length > 0 ? mergedUrls : undefined
        return {
          id: row.id,
          title: row.title,
          description: row.description ?? undefined,
          color: resolveGalleryMealCardColor(row.feeling_ids, row.base_group),
          base: '',
          protein: '',
          vegetable: '',
          method: row.cooking_method ?? 'grilled',
          baseGroup: row.base_group ?? undefined,
          mealType: row.meal_type ?? undefined,
          imageUrls,
          spoonacular_recipe_id: row.spoonacular_recipe_id ?? undefined,
          ingredientIds,
          ingredientNamesNormalized,
          feelingIds: normalizeFeelingIdList(row.feeling_ids),
          recipeDetail: recipe ?? undefined,
          cuisine: (row.cuisine ?? recipe?.cuisine ?? '').trim() || undefined
        }
      })
      setGalleryMealsFromDb(mapped)
    }
    load()
    return () => { cancelled = true }
  }, [feelingId])

  useEffect(() => {
    if (feelingId == null || feelingId === '') {
      setFeelingMealsFromDb([])
      return
    }
    let cancelled = false
    async function load () {
      const { data, error } = await supabase
        .from('gallery_meals')
        .select('id, title, description, cooking_method, meal_type, base_group, image_urls, spoonacular_recipe_id, cuisine, feeling_ids')
        .contains('feeling_ids', [feelingId])
        .order('sort_order')
      if (cancelled || error) {
        if (!cancelled && error) setFeelingMealsFromDb([])
        return
      }
      const rows = (data ?? []) as Array<{
        id: string
        title: string
        description: string | null
        cooking_method: string | null
        meal_type: string | null
        base_group: string | null
        image_urls: string[] | null
        spoonacular_recipe_id: number | null
        cuisine: string | null
        feeling_ids: string[] | null
      }>
      const recipeIds = rows.map((r) => r.spoonacular_recipe_id).filter((id): id is number => id != null)
      const [recipeMap, ingredientIdsMap, ingredientNamesMap] = await Promise.all([
        fetchRecipeDetailsMap(recipeIds),
        fetchRecipeIngredientIdsMap(recipeIds),
        fetchRecipeIngredientNamesMap(recipeIds)
      ])
      if (cancelled) return
      const mapped: ExplorerMeal[] = rows.map((row) => {
        const feelingIds = normalizeFeelingIdList(row.feeling_ids)
        const recipe = row.spoonacular_recipe_id != null ? recipeMap.get(row.spoonacular_recipe_id) : undefined
        const ingredientIds = row.spoonacular_recipe_id != null
          ? ingredientIdsMap.get(row.spoonacular_recipe_id) ?? []
          : []
        const ingredientNamesNormalized = row.spoonacular_recipe_id != null
          ? ingredientNamesMap.get(row.spoonacular_recipe_id) ?? []
          : []
        const existingUrls = Array.isArray(row.image_urls) ? row.image_urls : []
        const mergedUrls = mergeRecipeAndStoredImageUrls(
          recipe?.image_url,
          existingUrls,
          row.spoonacular_recipe_id
        )
        const imageUrls = mergedUrls.length > 0 ? mergedUrls : undefined
        return {
          id: row.id,
          title: row.title,
          description: row.description ?? undefined,
          color: resolveGalleryMealCardColor(row.feeling_ids, row.base_group),
          base: '',
          protein: '',
          vegetable: '',
          method: row.cooking_method ?? 'grilled',
          baseGroup: row.base_group ?? undefined,
          mealType: row.meal_type ?? undefined,
          imageUrls,
          spoonacular_recipe_id: row.spoonacular_recipe_id ?? undefined,
          ingredientIds,
          ingredientNamesNormalized,
          feelingIds,
          recipeDetail: recipe ?? undefined,
          cuisine: (row.cuisine ?? recipe?.cuisine ?? '').trim() || undefined
        }
      })
      const singleFeelingItems = mapped.filter((meal) => pickPrimaryFeelingId(meal.feelingIds ?? []) === feelingId)
      setFeelingMealsFromDb(singleFeelingItems)
    }
    load()
    return () => { cancelled = true }
  }, [feelingId])

  useEffect(() => {
    if (foodId == null || foodId === '') {
      setFoodName(null)
      return
    }
    let cancelled = false
    void (async () => {
      const { data: nameRow } = await supabase
        .from('food_items')
        .select('name')
        .eq('id', foodId)
        .maybeSingle()
      if (!cancelled && nameRow?.name != null) setFoodName((nameRow as { name: string }).name)
    })()
    return () => { cancelled = true }
  }, [foodId])

  const rawFeelingMeals = useMemo(() => getGalleryMealsForFeeling(feelingId), [feelingId])
  const feelingMeals = useMemo((): ExplorerMeal[] => {
    const source: ExplorerMeal[] = feelingMealsFromDb.length > 0
      ? feelingMealsFromDb
      : rawFeelingMeals.map(m => ({ ...m, ingredientIds: [] }))
    return source
      .filter((meal) => !mealViolatesAvoidLists(meal, blockedFoodNamesNormalized, isDisliked, isNotToday))
      .sort((a, b) => {
        const favA = Array.from(new Set(preferenceIdsForMeal(a))).filter((id) => isFavorite(id)).length
        const favB = Array.from(new Set(preferenceIdsForMeal(b))).filter((id) => isFavorite(id)).length
        return favB - favA
      })
      .map(m => ({ ...m, baseGroup: (m as ExplorerMeal).baseGroup ?? 'featured' }))
  }, [feelingMealsFromDb, rawFeelingMeals, blockedFoodNamesNormalized, isDisliked, isNotToday, isFavorite])

  const feelingMealsRef = useRef<ExplorerMeal[]>([])
  feelingMealsRef.current = feelingMeals

  useEffect(() => {
    if (feelingId == null || feelingId === '') {
      setFeelingBrowseMode('gallery')
      setFeelingSwipeDeck([])
      setFeelingSwipeStage('swipe')
      setFeelingSwipeIndex(0)
      setFeelingSwipeSaved([])
      return
    }
    const wantSwipe = browseParam === 'swipe'
    setFeelingBrowseMode(wantSwipe ? 'swipe' : 'gallery')
    if (!wantSwipe) {
      setFeelingSwipeDeck([])
      setFeelingSwipeStage('swipe')
      setFeelingSwipeIndex(0)
      setFeelingSwipeSaved([])
      return
    }
    const poolSource = feelingMealsRef.current
    if (poolSource.length === 0) {
      setFeelingSwipeDeck([])
      setFeelingSwipeStage('swipe')
      setFeelingSwipeIndex(0)
      setFeelingSwipeSaved([])
      return
    }
    const pool = [...poolSource]
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const a = pool[i]!
      pool[i] = pool[j]!
      pool[j] = a
    }
    const take = Math.min(FEELING_SWIPE_DECK_SIZE, pool.length)
    setFeelingSwipeDeck(pool.slice(0, take))
    setFeelingSwipeStage('swipe')
    setFeelingSwipeIndex(0)
    setFeelingSwipeSaved([])
  }, [feelingId, browseParam, feelingMeals.length])

  const foodMeals = useMemo((): ExplorerMeal[] => {
    if (foodId == null || foodId === '' || foodName == null || foodName === '') return []
    const foodNorm = normalizeFoodItemName(foodName)
    const pool = galleryMealsFromDb.length > 0 ? galleryMealsFromDb : []
    return pool
      .filter((meal) => ingredientNamesMatchFoodName(meal.ingredientNamesNormalized, foodNorm))
      .filter((meal) => !mealViolatesAvoidLists(meal, blockedFoodNamesNormalized, isDisliked, isNotToday))
      .sort((a, b) => {
        const favA = Array.from(new Set(preferenceIdsForMeal(a))).filter((id) => isFavorite(id)).length
        const favB = Array.from(new Set(preferenceIdsForMeal(b))).filter((id) => isFavorite(id)).length
        return favB - favA
      })
      .map(m => ({ ...m, baseGroup: (m as ExplorerMeal).baseGroup ?? 'featured' }))
  }, [foodId, foodName, galleryMealsFromDb, blockedFoodNamesNormalized, isDisliked, isNotToday, isFavorite])

  const galleryRespectingAvoidLists = useMemo(() => {
    const pool = galleryMealsFromDb.length > 0 ? galleryMealsFromDb : sampleImages
    return pool.filter(
      (meal) => !mealViolatesAvoidLists(meal, blockedFoodNamesNormalized, isDisliked, isNotToday)
    )
  }, [galleryMealsFromDb, blockedFoodNamesNormalized, isDisliked, isNotToday])

  const isFeelingMode = feelingId != null && feelingMeals.length > 0
  const isFoodMode = foodId != null
  const allItems: ExplorerMeal[] = isFeelingMode
    ? feelingMeals
    : isFoodMode
      ? foodMeals
      : galleryRespectingAvoidLists

  const categoryOptions = useMemo(() => {
    const set = new Set<string>()
    allItems.forEach((m) => {
      for (const t of getGalleryFilterTags(m)) {
        set.add(t)
      }
    })
    return ['all', ...Array.from(set).sort(compareGalleryCategoryKeys)]
  }, [allItems])

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const filtered = allItems.filter((meal) => {
      const idsToCheck = preferenceIdsForMeal(meal)
      if (idsToCheck.some((id) => isDisliked(id))) return false
      if (idsToCheck.some((id) => isNotToday(id))) return false
      if (q) {
        const title = (meal.title ?? '').toLowerCase()
        const desc = (meal.description ?? '').toLowerCase()
        if (!title.includes(q) && !desc.includes(q)) return false
      }
      if (categoryFilter !== 'all' && !mealMatchesGalleryCategory(meal, categoryFilter)) return false
      return true
    })
    filtered.sort((a, b) => {
      const favA = Array.from(new Set(preferenceIdsForMeal(a))).filter((id) => isFavorite(id)).length
      const favB = Array.from(new Set(preferenceIdsForMeal(b))).filter((id) => isFavorite(id)).length
      if (favB !== favA) return favB - favA
      const typeA = GALLERY_CATEGORY_LABELS[getGalleryShapeCategory(a)] ?? getGalleryShapeCategory(a)
      const typeB = GALLERY_CATEGORY_LABELS[getGalleryShapeCategory(b)] ?? getGalleryShapeCategory(b)
      const typeCmp = typeA.localeCompare(typeB)
      if (typeCmp !== 0) return typeCmp
      return (a.title ?? '').localeCompare(b.title ?? '')
    })
    return filtered
  }, [allItems, searchQuery, categoryFilter, blockedFoodNamesNormalized, isDisliked, isNotToday, isFavorite])

  const addSavedMeal = useCalendarStore(s => s.addSavedMeal)
  const savedMeals = useCalendarStore(s => s.savedMeals)
  const removeSavedMeal = useCalendarStore(s => s.removeSavedMeal)
  const setSurpriseSpinMeals = useCalendarStore(s => s.setSurpriseSpinMeals)

  const handleSurpriseMe = useCallback(() => {
    const pool = [...filteredItems]
    if (pool.length === 0) return
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]]
    }
    const take = Math.min(20, pool.length)
    const chosen = pool.slice(0, take).map((m): SavedMeal => ({
      id: m.id,
      title: m.title ?? '',
      baseId: m.base ?? '',
      proteinId: m.protein ?? '',
      vegetableId: m.vegetable ?? '',
      method: m.method ?? 'grill',
      createdAt: 0
    }))
    setSurpriseSpinMeals(chosen)
    closeDropdownsAndSearch()
    ;(router.push as (href: string) => void)('/game/surprise-spin')
  }, [filteredItems, setSurpriseSpinMeals, router])

  const feelingLabel = feelingId ? getFeelingById(feelingId)?.label : null
  const foodLabel = foodName ? `Meals with ${foodName}` : (foodId ? 'Meals with your pick' : null)

  const getSavedMealIdForExplorerMeal = useMemo(() => {
    return (meal: ExplorerMeal): string | null => {
      const galleryId = (meal.id ?? '').trim()
      if (galleryId) {
        const byGallery = savedMeals.find((m) => (m.galleryMealId ?? '').trim() === galleryId)
        if (byGallery) return byGallery.id
      }
      const match = savedMeals.find((m) => {
        if ((m.galleryMealId ?? '').trim()) return false
        const sameTitle = (m.title ?? '').trim().toLowerCase() === (meal.title ?? '').trim().toLowerCase()
        if (!sameTitle) return false
        const sameBase = (m.baseId ?? '') === (meal.base ?? '')
        const sameProtein = (m.proteinId ?? '') === (meal.protein ?? '')
        const sameVegetable = (m.vegetableId ?? '') === (meal.vegetable ?? '')
        const sameMethod = (m.method ?? '') === (meal.method ?? '')
        return sameBase && sameProtein && sameVegetable && sameMethod
      })
      return match?.id ?? null
    }
  }, [savedMeals])

  const toggleWantThis = async (meal: ExplorerMeal) => {
    const existingId = getSavedMealIdForExplorerMeal(meal)
    if (existingId) {
      await removeSavedMeal(existingId)
      return
    }
    await handleWantThis(meal, { shouldClose: false })
  }

  const handleWantThis = async (meal: ExplorerMeal, options?: { shouldClose?: boolean }) => {
    const galleryMealId = (meal.id ?? '').trim() || undefined
    const hasIds = !!(meal.base && meal.protein && meal.vegetable)
    if (hasIds) {
      await addSavedMeal({
        title: meal.title,
        baseId: meal.base,
        proteinId: meal.protein,
        vegetableId: meal.vegetable,
        method: meal.method ?? 'grill',
        galleryMealId
      })
    } else {
      await addSavedMeal({
        title: meal.title,
        baseId: '11111111-1111-1111-1111-111111111101',
        proteinId: '22222222-2222-2222-2222-222222222201',
        vegetableId: '33333333-3333-3333-3333-333333333302',
        method: meal.method ?? 'grilled',
        galleryMealId
      })
    }
    if (options?.shouldClose !== false) {
      setFullScreenViewerUrl(null)
      setSelectedMeal(null)
    }
  }

  const switchToFeelingGallery = useCallback(() => {
    setFeelingBrowseMode('gallery')
    setFeelingSwipeDeck([])
    setFeelingSwipeStage('swipe')
    setFeelingSwipeIndex(0)
    setFeelingSwipeSaved([])
    router.setParams({ browse: 'gallery' })
  }, [router])

  const startFeelingSwipeDeck = useCallback(() => {
    const pool = [...allItems]
    if (pool.length === 0) return
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const a = pool[i]!
      pool[i] = pool[j]!
      pool[j] = a
    }
    const take = Math.min(FEELING_SWIPE_DECK_SIZE, pool.length)
    setFeelingSwipeDeck(pool.slice(0, take))
    setFeelingSwipeStage('swipe')
    setFeelingSwipeIndex(0)
    setFeelingSwipeSaved([])
    setFeelingBrowseMode('swipe')
  }, [allItems])

  const handleFeelingSwipe = useCallback(
    (direction: 'left' | 'right') => {
      const current = feelingSwipeDeck[feelingSwipeIndex]
      if (!current) return
      const nextSaved = direction === 'right' ? [...feelingSwipeSaved, current] : feelingSwipeSaved
      if (direction === 'right') {
        void handleWantThis(current, { shouldClose: false })
      }
      if (feelingSwipeIndex < feelingSwipeDeck.length - 1) {
        setFeelingSwipeSaved(nextSaved)
        setFeelingSwipeIndex((n) => n + 1)
      } else {
        setFeelingSwipeSaved(nextSaved)
        setFeelingSwipeStage('complete')
      }
    },
    [feelingSwipeDeck, feelingSwipeIndex, feelingSwipeSaved, handleWantThis]
  )

  const finishFeelingSwipeEarly = useCallback(() => {
    setFeelingSwipeStage('complete')
  }, [])

  const chooseFeelingMealOfTheDay = useCallback(async () => {
    const current = feelingSwipeDeck[feelingSwipeIndex]
    if (!current) return
    try {
      await handleWantThis(current, { shouldClose: false })
    } catch {
      Alert.alert('Error', 'Could not save this meal. Try again.')
      return
    }
    switchToFeelingGallery()
    router.push({ pathname: '/recipe/[id]', params: { id: current.id } })
  }, [feelingSwipeDeck, feelingSwipeIndex, switchToFeelingGallery, router])

  const mealToSwipeDisplay = useCallback((meal: ExplorerMeal) => ({
    title: meal.title ?? '',
    description: meal.description,
    cookingMethod: getMethodDisplayPast(meal.method),
    imageUrl: meal.imageUrls?.[0] ?? null
  }), [])

  const numColumns = viewMode === 'list' ? 1 : viewMode === 'big' ? 2 : 3
  const isSelectedMealAdded = useMemo(() => {
    if (!selectedMeal) return false
    const meal = selectedMeal
    return getSavedMealIdForExplorerMeal(meal) != null
  }, [selectedMeal, getSavedMealIdForExplorerMeal])

  const selectedSavedMealId = useMemo(() => {
    if (!selectedMeal) return null
    return getSavedMealIdForExplorerMeal(selectedMeal)
  }, [selectedMeal, getSavedMealIdForExplorerMeal])

  const handleModalAddPhoto = useCallback(async () => {
    if (!selectedMeal) return
    setModalAddingPhoto(true)
    try {
      let savedId = selectedSavedMealId ?? getSavedMealIdForExplorerMeal(selectedMeal)
      if (!savedId) {
        await handleWantThis(selectedMeal, { shouldClose: false })
        savedId = getSavedMealIdForExplorerMeal(selectedMeal)
      }
      if (!savedId) {
        Alert.alert('Error', 'Could not add meal to list.')
        return
      }
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow access to your photos to add a meal picture.')
        return
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8
      })
      if (result.canceled || !result.assets?.[0]?.uri) return
      const dataUrl = await uriToDataUrl(result.assets[0].uri)
      if (!dataUrl) {
        Alert.alert('Error', 'Could not read the image. Please try again.')
        return
      }
      await addPhotoOffline(savedId, dataUrl)
      await loadMealPhotos()
      Alert.alert('Saved', 'Photo saved to this device.')
    } catch (err) {
      Alert.alert('Error', 'Could not save photo.')
    } finally {
      setModalAddingPhoto(false)
    }
  }, [selectedMeal, selectedSavedMealId, getSavedMealIdForExplorerMeal, handleWantThis, addPhotoOffline, loadMealPhotos])

  const closeMealModal = useCallback(() => {
    setFullScreenViewerUrl(null)
    setSelectedMeal(null)
  }, [])

  const openMealImageFullscreen = useCallback((url: string) => {
    const hi = getBestRecipeImageUrlForViewing(url) ?? url
    void Image.prefetch(hi).catch(() => {})
    setFullScreenViewerUrl(hi)
  }, [])

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGalleryBack}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {feelingId ? feelingLabel ?? 'Food Gallery' : isFoodMode ? foodLabel ?? 'Food Gallery' : 'Food Gallery'}
        </Text>
      </View>

      {feelingBrowseMode === 'swipe' && feelingSwipeDeck.length > 0
        ? (
          <View style={styles.feelingSwipeWrap}>
            {feelingSwipeStage === 'complete'
              ? (
                <ScrollView contentContainerStyle={styles.feelingSwipeCompleteScroll} showsVerticalScrollIndicator={false}>
                  <Text style={[styles.feelingSwipeCompleteTitle, { color: colors.text }]}>Done swiping</Text>
                  <Text style={[styles.feelingSwipeCompleteSub, { color: colors.textMuted }]}>
                    You added {feelingSwipeSaved.length} meal{feelingSwipeSaved.length !== 1 ? 's' : ''} to Meals I want
                  </Text>
                  {feelingSwipeSaved.length > 0 && (
                    <View style={styles.feelingSwipeSavedList}>
                      {feelingSwipeSaved.map((m) => (
                        <View
                          key={m.id}
                          style={[styles.feelingSwipeSavedCard, { backgroundColor: colors.card, borderColor: colors.primary }]}
                        >
                          <Text style={[styles.feelingSwipeSavedTitle, { color: colors.text }]} numberOfLines={2}>
                            {m.title}
                          </Text>
                          {m.description
                            ? (
                              <Text style={[styles.feelingSwipeSavedDesc, { color: colors.textMuted }]} numberOfLines={2}>
                                {m.description}
                              </Text>
                              )
                            : null}
                        </View>
                      ))}
                    </View>
                  )}
                  <TouchableOpacity
                    style={[styles.feelingSwipePrimaryBtn, { backgroundColor: colors.primary }]}
                    onPress={startFeelingSwipeDeck}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.feelingSwipePrimaryBtnText}>Swipe again</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.feelingSwipeSecondaryBtn, { backgroundColor: colors.secondaryBg }]}
                    onPress={switchToFeelingGallery}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.feelingSwipeSecondaryBtnText, { color: colors.text }]}>Back to full gallery</Text>
                  </TouchableOpacity>
                </ScrollView>
                )
              : (
                <View style={styles.feelingSwipeActive}>
                  <View style={styles.feelingSwipeHeader}>
                    <Text style={[styles.feelingSwipeTitle, { color: colors.text }]}>Swipe to sort</Text>
                    <Text style={[styles.feelingSwipeCounter, { color: colors.textMuted }]}>
                      {feelingSwipeIndex + 1} / {feelingSwipeDeck.length}
                    </Text>
                  </View>
                  <View style={styles.feelingSwipeCards} pointerEvents="box-none">
                    {[feelingSwipeIndex, feelingSwipeIndex + 1]
                      .filter((idx) => idx >= 0 && idx < feelingSwipeDeck.length)
                      .map((idx) => {
                        const card = feelingSwipeDeck[idx]!
                        const isTop = idx === feelingSwipeIndex
                        return (
                          <SwipeCard
                            key={`${card.id}-${isTop ? 'top' : 'next'}`}
                            cardDisplay={mealToSwipeDisplay(card)}
                            onSwipe={handleFeelingSwipe}
                            onSwipeUp={isTop ? () => { void chooseFeelingMealOfTheDay() } : undefined}
                            isTop={isTop}
                            themeColors={colors}
                          />
                        )
                      })}
                  </View>
                  <View
                    style={styles.feelingSwipeHints}
                    accessibilityRole="text"
                    accessibilityLabel="Swipe left to skip, swipe up to select meal of the day, swipe right to save"
                  >
                    <View style={styles.feelingSwipeHintItem}>
                      <View style={[styles.feelingSwipeHintIcon, { backgroundColor: colors.destructive + '30' }]}>
                        <Text style={styles.feelingSwipeHintEmoji}>👈</Text>
                      </View>
                      <Text style={[styles.feelingSwipeHintLabel, { color: colors.text }]}>Swipe left to skip</Text>
                    </View>
                    <View style={styles.feelingSwipeHintItem}>
                      <View style={[styles.feelingSwipeHintIcon, styles.feelingSwipeHintIconBlue]}>
                        <Text style={styles.feelingSwipeHintEmoji}>👆</Text>
                      </View>
                      <Text style={[styles.feelingSwipeHintLabel, { color: colors.text }]}>
                        Swipe up to select
                      </Text>
                    </View>
                    <View style={styles.feelingSwipeHintItem}>
                      <View style={[styles.feelingSwipeHintIcon, { backgroundColor: colors.primary + '30' }]}>
                        <Text style={styles.feelingSwipeHintEmoji}>👉</Text>
                      </View>
                      <Text style={[styles.feelingSwipeHintLabel, { color: colors.text }]}>Swipe right to save</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.feelingSwipeFinishEarly, { backgroundColor: colors.secondaryBg }]}
                    onPress={finishFeelingSwipeEarly}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.feelingSwipeFinishEarlyText, { color: colors.textMuted }]}>
                      Finish swiping — skip remaining & see results
                    </Text>
                  </TouchableOpacity>
                </View>
                )}
          </View>
          )
        : null}

      {!(feelingBrowseMode === 'swipe' && feelingSwipeDeck.length > 0)
        ? (
      <>
      <View style={styles.filtersRow}>
        {searchExpanded
          ? (
            <View style={[styles.searchWrap, { backgroundColor: colors.card }]}>
              <Search size={18} color={colors.textMuted} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search meals..."
                placeholderTextColor={colors.placeholder}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              <TouchableOpacity onPress={closeDropdownsAndSearch} style={styles.searchCloseBtn}>
                <X size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            )
          : (
            <>
              <TouchableOpacity
                style={[
                  styles.filterBtn,
                  { backgroundColor: colors.secondaryBg },
                  categoryDropdownOpen && { backgroundColor: colors.cardBorder }
                ]}
                onPress={() => {
                  setCategoryDropdownOpen((v) => !v)
                  setSearchExpanded(false)
                }}
              >
                <Text style={[styles.filterBtnLabel, { color: colors.text }]} numberOfLines={1}>
                  {categoryFilter === 'all' ? 'Food type' : (GALLERY_CATEGORY_LABELS[categoryFilter] ?? categoryFilter)}
                </Text>
                <ChevronDown size={16} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterBtn,
                  { backgroundColor: colors.secondaryBg },
                  surpriseMeGlow && styles.surpriseMeGlow
                ]}
                onPress={handleSurpriseMe}
                disabled={filteredItems.length === 0}
              >
                <Text style={[styles.filterBtnLabel, { color: filteredItems.length === 0 ? colors.textMuted : colors.text }]} numberOfLines={1}>
                  Surprise Me
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterBtn, { backgroundColor: colors.secondaryBg }]}
                onPress={() => {
                  setSearchExpanded(true)
                  setCategoryDropdownOpen(false)
                }}
              >
                <Search size={18} color={colors.textMuted} />
                <Text style={[styles.filterBtnLabel, { color: colors.text }]}>Search</Text>
              </TouchableOpacity>
            </>
            )}
      </View>

      {categoryDropdownOpen && (
        <Modal visible transparent animationType="fade">
          <TouchableOpacity
            style={styles.dropdownBackdrop}
            activeOpacity={1}
            onPress={() => setCategoryDropdownOpen(false)}
          >
            <View style={[styles.dropdownPanel, { backgroundColor: colors.card }]}>
              <ScrollView style={styles.dropdownScroll} keyboardShouldPersistTaps="handled">
                {categoryOptions.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.dropdownItem,
                      { borderBottomColor: colors.cardBorder },
                      categoryFilter === cat && { backgroundColor: colors.primary }
                    ]}
                    onPress={() => {
                      setCategoryFilter(cat)
                      setCategoryDropdownOpen(false)
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        { color: colors.text },
                        categoryFilter === cat && styles.dropdownItemTextActive
                      ]}
                    >
                      {cat === 'all' ? 'All categories' : (GALLERY_CATEGORY_LABELS[cat] ?? cat)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      <View style={styles.viewToggleRow}>
        <Text style={[styles.resultCount, { color: colors.textMuted }]}>{filteredItems.length} meals</Text>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            onPress={() => setViewMode('list')}
            style={[
              styles.viewBtn,
              { backgroundColor: colors.secondaryBg },
              viewMode === 'list' && { backgroundColor: colors.primary }
            ]}
          >
            <List size={20} color={viewMode === 'list' ? colors.primaryText : colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setViewMode('big')}
            style={[
              styles.viewBtn,
              { backgroundColor: colors.secondaryBg },
              viewMode === 'big' && { backgroundColor: colors.primary }
            ]}
          >
            <LayoutGrid size={20} color={viewMode === 'big' ? colors.primaryText : colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setViewMode('small')}
            style={[
              styles.viewBtn,
              { backgroundColor: colors.secondaryBg },
              viewMode === 'small' && { backgroundColor: colors.primary }
            ]}
          >
            <LayoutGrid size={18} color={viewMode === 'small' ? colors.primaryText : colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {filteredItems.length === 0
        ? (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No meals match your filters.</Text>
            <TouchableOpacity onPress={() => { closeDropdownsAndSearch(); setSearchQuery(''); setCategoryFilter('all') }}>
              <Text style={[styles.emptyLink, { color: colors.primary }]}>Clear filters</Text>
            </TouchableOpacity>
          </View>
          )
        : (
          <FlatList
            data={filteredItems}
            keyExtractor={(item) => item.id}
            numColumns={numColumns}
            key={numColumns}
            contentContainerStyle={styles.listContent}
            columnWrapperStyle={numColumns > 1 ? styles.columnWrap : undefined}
            renderItem={({ item, index }) => {
              const savedMealId = getSavedMealIdForExplorerMeal(item)
              const userPhotoUrl = savedMealId ? getPhotoUrl(savedMealId) : null
              return (
                <MealCard
                  meal={item}
                  viewMode={viewMode}
                  noMarginRight={numColumns > 1 && (index % numColumns) === numColumns - 1}
                  onPress={() => { closeDropdownsAndSearch(); setSelectedMeal(item) }}
                  onToggleWant={() => void toggleWantThis(item)}
                  isAdded={savedMealId != null}
                  userPhotoUrl={userPhotoUrl}
                />
              )
            }}
          />
          )}
      </>
          )
        : null}

      <Modal visible={selectedMeal != null} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeMealModal}
            accessibilityRole="button"
            accessibilityLabel="Dismiss meal details"
          />
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.card, maxHeight: Math.round(SCREEN_HEIGHT * 0.88) }
            ]}
          >
            <TouchableOpacity style={styles.modalClose} onPress={closeMealModal}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            {selectedMeal && (() => {
              const modalImageUrl = (selectedSavedMealId ? getPhotoUrl(selectedSavedMealId) : null) ?? selectedMeal.imageUrls?.[0]
              return (
              <>
                <View style={styles.modalImageTouchable}>
                  {modalImageUrl
                    ? (
                      <View style={styles.modalImageWrap}>
                        <TouchableOpacity
                          activeOpacity={0.92}
                          onPress={() => { if (!modalAddingPhoto) openMealImageFullscreen(modalImageUrl) }}
                          disabled={modalAddingPhoto}
                          style={styles.modalImageHeroTouch}
                        >
                          <Image source={{ uri: modalImageUrl }} style={styles.modalImage} resizeMode="cover" />
                          {modalAddingPhoto
                            ? (
                              <View style={styles.modalImageOverlay}>
                                <ActivityIndicator size="large" color="#ffffff" />
                              </View>
                              )
                            : (
                              <View style={styles.modalTapToEnlargeHint} pointerEvents="none">
                                <Text style={styles.modalTapToEnlargeText}>Tap to enlarge</Text>
                              </View>
                              )}
                        </TouchableOpacity>
                        {!selectedSavedMealId && selectedMeal.imageUrls && selectedMeal.imageUrls.length > 1 && (
                          <View style={styles.modalImageStrip}>
                            {selectedMeal.imageUrls.slice(1, 3).map((url, idx) => (
                              <TouchableOpacity
                                key={idx}
                                activeOpacity={0.85}
                                onPress={() => openMealImageFullscreen(url)}
                                style={styles.modalImageThumbTouch}
                              >
                                <Image source={{ uri: url }} style={styles.modalImageThumb} resizeMode="cover" />
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </View>
                      )
                    : (
                      <View style={[styles.modalColorBar, { backgroundColor: selectedMeal.color }]}>
                        <Text style={styles.modalEmoji}>📷</Text>
                      </View>
                      )}
                  <TouchableOpacity
                    style={[styles.modalAddPhotoRow, { borderTopColor: colors.cardBorder }]}
                    onPress={handleModalAddPhoto}
                    disabled={modalAddingPhoto}
                  >
                    {modalAddingPhoto
                      ? <ActivityIndicator size="small" color={colors.textMuted} />
                      : <Camera size={20} color={colors.textMuted} />}
                    <Text style={[styles.modalAddPhotoRowText, { color: colors.textMuted }]}>
                      {selectedSavedMealId && getPhotoUrl(selectedSavedMealId) ? 'Change photo' : 'Add your photo'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <ScrollView
                  style={styles.modalScroll}
                  contentContainerStyle={styles.modalScrollContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator
                  nestedScrollEnabled
                >
                  <Text style={[styles.modalTitle, { color: colors.text }]}>{formatRecipeTitle(selectedMeal.title ?? '')}</Text>
                  {selectedMeal.description
                    ? <Text style={[styles.modalDesc, { color: colors.textMuted }]}>{selectedMeal.description}</Text>
                    : null}
                  {selectedMeal.recipeDetail?.servings != null && (
                    <View style={[styles.modalRecipeDetail, { backgroundColor: colors.secondaryBg, borderColor: colors.cardBorder }]}>
                      <Text style={[styles.modalRecipeMeta, { color: colors.textMuted }]}>
                        Serves {selectedMeal.recipeDetail.servings}
                      </Text>
                    </View>
                  )}
                </ScrollView>
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[
                      styles.modalWantBtn,
                      { backgroundColor: colors.primary }
                    ]}
                    onPress={async () => {
                      if (isSelectedMealAdded && selectedSavedMealId) {
                        await removeSavedMeal(selectedSavedMealId)
                        return
                      }
                      await handleWantThis(selectedMeal, { shouldClose: false })
                    }}
                  >
                    <Heart size={22} color="#ffffff" fill={isSelectedMealAdded ? '#ffffff' : 'transparent'} />
                    <Text style={styles.modalWantText}>{isSelectedMealAdded ? 'Added' : 'Add this to the list'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalRecipeBtn, { backgroundColor: colors.secondaryBg, borderColor: colors.cardBorder }]}
                    onPress={() => {
                      closeMealModal()
                      router.push({ pathname: '/recipe/[id]', params: { id: selectedMeal.id } })
                    }}
                  >
                    <Text style={[styles.modalRecipeText, { color: colors.text }]}>Recipe</Text>
                  </TouchableOpacity>
                </View>
              </>
            )
            })()}
          </View>
        </View>
      </Modal>

      <MealImageFullscreenViewer
        visible={fullScreenViewerUrl != null}
        imageUrl={fullScreenViewerUrl}
        onClose={() => setFullScreenViewerUrl(null)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingHorizontal: PAD,
    paddingBottom: 12
  },
  backButton: { marginRight: 12 },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff'
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: PAD,
    marginBottom: 12
  },
  filterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#1e293b'
  },
  surpriseMeGlow: {
    borderWidth: 2,
    borderColor: '#f59e0b',
    shadowColor: '#f59e0b',
    shadowOpacity: 0.95,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10
  },
  filterBtnLabel: {
    fontSize: 13,
    color: '#e2e8f0',
    fontWeight: '600'
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 12
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 16,
    color: '#f1f5f9'
  },
  searchCloseBtn: {
    padding: 4
  },
  dropdownBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    paddingTop: 120,
    paddingHorizontal: PAD
  },
  dropdownPanel: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    maxHeight: 320
  },
  dropdownScroll: {
    maxHeight: 320
  },
  dropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#334155'
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#e2e8f0'
  },
  dropdownItemTextActive: {
    color: '#ffffff',
    fontWeight: '600'
  },
  viewToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: PAD,
    marginBottom: 12
  },
  resultCount: {
    fontSize: 13,
    color: '#94a3b8'
  },
  viewToggle: {
    flexDirection: 'row',
    gap: 4
  },
  viewBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#1e293b'
  },
  viewBtnActive: {
    backgroundColor: '#e2e8f0'
  },
  listContent: {
    paddingHorizontal: PAD,
    paddingBottom: 24
  },
  columnWrap: {
    justifyContent: 'flex-start',
    marginBottom: 0
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden'
  },
  cardInner: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between'
  },
  cardInnerList: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12
  },
  cardEmoji: {
    marginBottom: 4,
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    padding: 8
  },
  cardEmojiSmall: {
    paddingTop: 0,
    paddingLeft: 6
  },
  cardImageWrap: {
    width: '100%',
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 4
  },
  cardImageWrapBig: {
    flex: 1,
    height: undefined,
    minHeight: 72,
    marginBottom: 6
  },
  cardImageWrapSmall: {
    flex: 1,
    height: undefined,
    minHeight: 44,
    marginBottom: 4
  },
  cardImage: {
    width: '100%',
    height: '100%'
  },
  listThumbWrap: {
    width: 56,
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12
  },
  listThumb: {
    width: '100%',
    height: '100%'
  },
  listThumbPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  emojiText: { fontSize: 28 },
  cardTextWrap: {
    flex: 1
  },
  cardTextWrapGrid: {
    flex: 0
  },
  cardTextWrapList: {
    marginLeft: 0,
    flex: 1
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff'
  },
  cardTitleSmall: {
    fontSize: 12
  },
  cardCategory: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2
  },
  heartWrap: {
    position: 'absolute',
    top: 8,
    right: 8
  },
  heartWrapList: {
    position: 'relative',
    top: undefined,
    right: undefined,
    marginLeft: 8
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  emptyText: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 12
  },
  emptyLink: {
    fontSize: 15,
    color: '#22c55e',
    fontWeight: '600'
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    flexDirection: 'column',
    flexShrink: 1,
    zIndex: 1,
    elevation: 8,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    overflow: 'hidden'
  },
  modalClose: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1
  },
  modalImageTouchable: {
    position: 'relative'
  },
  modalImageHeroTouch: {
    position: 'relative',
    width: '100%'
  },
  modalImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12
  },
  modalTapToEnlargeHint: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    alignItems: 'center'
  },
  modalTapToEnlargeText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden'
  },
  modalAddPhotoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: PAD,
    borderTopWidth: StyleSheet.hairlineWidth
  },
  modalAddPhotoRowText: {
    fontSize: 14,
    fontWeight: '600'
  },
  modalImageWrap: {
    paddingHorizontal: PAD,
    paddingTop: 8
  },
  modalImage: {
    width: '100%',
    height: 160,
    borderRadius: 12
  },
  modalImageStrip: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8
  },
  modalImageThumbTouch: {
    flex: 1
  },
  modalImageThumb: {
    width: '100%',
    height: 56,
    borderRadius: 8
  },
  modalColorBar: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalEmoji: { fontSize: 48 },
  modalScroll: {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 0
  },
  modalScrollContent: {
    padding: PAD,
    paddingBottom: 12
  },
  modalActions: {
    flexShrink: 0,
    paddingTop: 4
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4
  },
  modalDesc: {
    fontSize: 14,
    color: '#cbd5e1',
    lineHeight: 20
  },
  modalRecipeDetail: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1
  },
  modalRecipeMeta: {
    fontSize: 13
  },
  modalWantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#22c55e',
    marginHorizontal: PAD,
    marginTop: 8,
    padding: 16,
    borderRadius: 12
  },
  modalWantText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff'
  },
  modalRecipeBtn: {
    marginHorizontal: PAD,
    marginTop: 10,
    marginBottom: PAD,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalRecipeText: {
    fontSize: 16,
    fontWeight: '700'
  },
  feelingSwipeWrap: {
    flex: 1,
    minHeight: 400
  },
  feelingSwipeActive: {
    flex: 1
  },
  feelingSwipeHeader: {
    paddingTop: 8,
    paddingHorizontal: PAD,
    paddingBottom: 12,
    alignItems: 'center'
  },
  feelingSwipeTitle: {
    fontSize: 22,
    fontWeight: '700'
  },
  feelingSwipeCounter: {
    fontSize: 15,
    marginTop: 4
  },
  feelingSwipeCards: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12
  },
  feelingSwipeHints: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: PAD,
    paddingVertical: 20
  },
  feelingSwipeHintItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4
  },
  feelingSwipeHintIconBlue: {
    backgroundColor: '#7dd3fc40'
  },
  feelingSwipeHintIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8
  },
  feelingSwipeHintEmoji: {
    fontSize: 22
  },
  feelingSwipeHintLabel: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center'
  },
  feelingSwipeFinishEarly: {
    marginHorizontal: PAD,
    marginBottom: 20,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center'
  },
  feelingSwipeFinishEarlyText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center'
  },
  feelingSwipeCompleteScroll: {
    padding: PAD,
    paddingBottom: 40
  },
  feelingSwipeCompleteTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8
  },
  feelingSwipeCompleteSub: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20
  },
  feelingSwipeSavedList: {
    gap: 10,
    marginBottom: 24
  },
  feelingSwipeSavedCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 2
  },
  feelingSwipeSavedTitle: {
    fontSize: 16,
    fontWeight: '700'
  },
  feelingSwipeSavedDesc: {
    fontSize: 13,
    marginTop: 4
  },
  feelingSwipePrimaryBtn: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 10
  },
  feelingSwipePrimaryBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff'
  },
  feelingSwipeSecondaryBtn: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center'
  },
  feelingSwipeSecondaryBtnText: {
    fontSize: 16,
    fontWeight: '600'
  }
})
