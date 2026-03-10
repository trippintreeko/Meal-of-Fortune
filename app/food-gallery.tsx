import { useState, useEffect, useRef, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  ScrollView,
  Dimensions,
  Image
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { ChevronLeft, ChevronDown, Heart, Search, List, LayoutGrid, X } from 'lucide-react-native'
import { useThemeColors } from '@/hooks/useTheme'
import { getGalleryMealsForFeeling, getFeelingById } from '@/lib/feelings'
import { useCalendarStore } from '@/store/calendar-store'
import { useFoodPreferencesStore } from '@/store/food-preferences-store'
import { supabase } from '@/lib/supabase'
import { getMethodDisplayPast, MEAL_COOKING_METHODS, normalizeCookingMethodFromDb } from '@/lib/cooking-methods'
import type { GalleryMeal } from '@/lib/feelings'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const PAD = 16
const GAP = 10

type ViewMode = 'list' | 'big' | 'small'

type ExplorerMeal = GalleryMeal & {
  description?: string
  baseGroup?: string
  /** Up to 3 pre-fetched image URLs (e.g. from Unsplash) for instant display */
  imageUrls?: string[]
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

const BASE_GROUP_LABELS: Record<string, string> = {
  rice: 'Rice',
  noodles: 'Noodles & Ramen',
  quinoa: 'Quinoa & Grain',
  tortilla: 'Tortilla & Wrap',
  bread: 'Bread',
  toast: 'Toast',
  pasta: 'Pasta',
  breakfast: 'Breakfast',
  potato: 'Potato',
  corn: 'Corn',
  pizza: 'Pizza',
  dough: 'Dough',
  legume: 'Legume',
  plant: 'Plant-based',
  fermented: 'Fermented',
  seaweed: 'Seaweed',
  seed: 'Seed',
  soup: 'Soup',
  salad: 'Salad',
  sushi: 'Sushi',
  dessert: 'Dessert',
  any: 'Any',
  featured: 'Featured'
}

const sampleImages: ExplorerMeal[] = [
  { id: '1', title: 'Fried Rice with Chicken', color: '#f59e0b', base: '', protein: '', vegetable: '', method: 'stove', baseGroup: 'rice' },
  { id: '2', title: 'Baked Salmon with Quinoa', color: '#ec4899', base: '', protein: '', vegetable: '', method: 'baked', baseGroup: 'quinoa' },
  { id: '3', title: 'Steamed Broccoli & Tofu', color: '#22c55e', base: '', protein: '', vegetable: '', method: 'steamed', baseGroup: 'any' },
  { id: '4', title: 'Grilled Steak with Potatoes', color: '#ef4444', base: '', protein: '', vegetable: '', method: 'grilled', baseGroup: 'any' },
  { id: '5', title: 'Pasta with Tomato Sauce', color: '#8b5cf6', base: '', protein: '', vegetable: '', method: 'stove', baseGroup: 'pasta' },
  { id: '6', title: 'Burrito Bowl', color: '#f97316', base: '', protein: '', vegetable: '', method: 'grilled', baseGroup: 'tortilla' }
]

function MealCard ({
  meal,
  viewMode,
  noMarginRight,
  onPress,
  onToggleWant,
  isAdded
}: {
  meal: ExplorerMeal
  viewMode: ViewMode
  noMarginRight?: boolean
  onPress: () => void
  onToggleWant: () => void
  isAdded: boolean
}) {
  const isList = viewMode === 'list'
  const isBig = viewMode === 'big'
  const isSmall = viewMode === 'small'
  const numCols = isList ? 1 : isBig ? 2 : 3
  const cardWidth = isList ? undefined : (SCREEN_WIDTH - PAD * 2 - GAP * (numCols - 1)) / numCols
  const cardHeight = isList ? 72 : isBig ? 140 : 96

  const thumbUrl = meal.imageUrls?.[0]
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
              <View style={styles.cardImageWrap}>
                <Image source={{ uri: thumbUrl }} style={styles.cardImage} resizeMode="cover" />
              </View>
              )
            : (
              <View style={styles.cardEmoji}><Text style={styles.emojiText}>📷</Text></View>
              )
        )}
        <View style={[styles.cardTextWrap, isList && styles.cardTextWrapList]}>
          <Text style={[styles.cardTitle, isSmall && styles.cardTitleSmall]} numberOfLines={isList ? 1 : 2}>
            {meal.title}
          </Text>
          {isList && meal.baseGroup && (
            <Text style={styles.cardCategory}>{BASE_GROUP_LABELS[meal.baseGroup] ?? meal.baseGroup}</Text>
          )}
        </View>
        <TouchableOpacity
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={(e) => {
            e.stopPropagation()
            onToggleWant()
          }}
          style={styles.heartWrap}
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
  const params = useLocalSearchParams<{ feeling?: string; food?: string }>()
  const feelingId = (params.feeling ?? '').trim() || null
  const foodId = (params.food ?? '').trim() || null
  const loadPreferences = useFoodPreferencesStore(s => s.load)
  const isDisliked = useFoodPreferencesStore(s => s.isDisliked)
  const isNotToday = useFoodPreferencesStore(s => s.isNotToday)
  const isFavorite = useFoodPreferencesStore(s => s.isFavorite)

  const [galleryMealsFromDb, setGalleryMealsFromDb] = useState<ExplorerMeal[]>([])
  const [feelingMealsFromDb, setFeelingMealsFromDb] = useState<ExplorerMeal[]>([])
  const [foodMealsFromDb, setFoodMealsFromDb] = useState<ExplorerMeal[]>([])
  const [foodName, setFoodName] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [methodFilter, setMethodFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('big')
  const [searchExpanded, setSearchExpanded] = useState(false)
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false)
  const [methodDropdownOpen, setMethodDropdownOpen] = useState(false)
  const [selectedMeal, setSelectedMeal] = useState<ExplorerMeal | null>(null)

  const closeDropdownsAndSearch = () => {
    setSearchExpanded(false)
    setCategoryDropdownOpen(false)
    setMethodDropdownOpen(false)
  }

  useEffect(() => {
    loadPreferences()
  }, [loadPreferences])

  useEffect(() => {
    if (feelingId != null && feelingId !== '') return
    let cancelled = false
    async function load () {
      const { data, error } = await supabase
        .from('gallery_meals')
        .select('id, title, description, base_id, protein_id, vegetable_id, cooking_method, base_group, image_urls')
        .order('sort_order')
      if (cancelled || error) {
        if (!cancelled && error) setGalleryMealsFromDb([])
        return
      }
      const mapped: ExplorerMeal[] = (data ?? []).map((row: {
        id: string
        title: string
        description: string | null
        base_id: string | null
        protein_id: string | null
        vegetable_id: string | null
        cooking_method: string | null
        base_group: string | null
        image_urls: string[] | null
      }) => ({
        id: row.id,
        title: row.title,
        description: row.description ?? undefined,
        color: BASE_GROUP_COLORS[row.base_group ?? 'any'] ?? BASE_GROUP_COLORS.any,
        base: row.base_id ?? '',
        protein: row.protein_id ?? '',
        vegetable: row.vegetable_id ?? '',
        method: row.cooking_method ?? 'grilled',
        baseGroup: row.base_group ?? undefined,
        imageUrls: Array.isArray(row.image_urls) ? row.image_urls : undefined
      }))
      setGalleryMealsFromDb(mapped)
    }
    load()
    return () => { cancelled = true }
  }, [feelingId, foodId])

  useEffect(() => {
    if (feelingId == null || feelingId === '') {
      setFeelingMealsFromDb([])
      return
    }
    let cancelled = false
    async function load () {
      const { data, error } = await supabase
        .from('gallery_meals')
        .select('id, title, description, base_id, protein_id, vegetable_id, cooking_method, base_group, image_urls')
        .contains('feeling_ids', [feelingId])
        .order('sort_order')
      if (cancelled || error) {
        if (!cancelled && error) setFeelingMealsFromDb([])
        return
      }
      const mapped: ExplorerMeal[] = (data ?? []).map((row: {
        id: string
        title: string
        description: string | null
        base_id: string | null
        protein_id: string | null
        vegetable_id: string | null
        cooking_method: string | null
        base_group: string | null
        image_urls: string[] | null
      }) => ({
        id: row.id,
        title: row.title,
        description: row.description ?? undefined,
        color: BASE_GROUP_COLORS[row.base_group ?? 'any'] ?? BASE_GROUP_COLORS.any,
        base: row.base_id ?? '',
        protein: row.protein_id ?? '',
        vegetable: row.vegetable_id ?? '',
        method: row.cooking_method ?? 'grilled',
        baseGroup: row.base_group ?? undefined,
        imageUrls: Array.isArray(row.image_urls) ? row.image_urls : undefined
      }))
      setFeelingMealsFromDb(mapped)
    }
    load()
    return () => { cancelled = true }
  }, [feelingId])

  useEffect(() => {
    if (foodId == null || foodId === '') {
      setFoodMealsFromDb([])
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

  useEffect(() => {
    if (foodId == null || foodId === '') {
      setFoodMealsFromDb([])
      return
    }
    let cancelled = false
    async function load () {
      const { data, error } = await supabase
        .from('gallery_meals')
        .select('id, title, description, base_id, protein_id, vegetable_id, cooking_method, base_group, image_urls')
        .or(`base_id.eq.${foodId},protein_id.eq.${foodId},vegetable_id.eq.${foodId}`)
        .order('sort_order')
      if (cancelled || error) {
        if (!cancelled && error) setFoodMealsFromDb([])
        return
      }
      const mapped: ExplorerMeal[] = (data ?? []).map((row: {
        id: string
        title: string
        description: string | null
        base_id: string | null
        protein_id: string | null
        vegetable_id: string | null
        cooking_method: string | null
        base_group: string | null
        image_urls: string[] | null
      }) => ({
        id: row.id,
        title: row.title,
        description: row.description ?? undefined,
        color: BASE_GROUP_COLORS[row.base_group ?? 'any'] ?? BASE_GROUP_COLORS.any,
        base: row.base_id ?? '',
        protein: row.protein_id ?? '',
        vegetable: row.vegetable_id ?? '',
        method: row.cooking_method ?? 'grilled',
        baseGroup: row.base_group ?? undefined,
        imageUrls: Array.isArray(row.image_urls) ? row.image_urls : undefined
      }))
      setFoodMealsFromDb(mapped)
    }
    load()
    return () => { cancelled = true }
  }, [foodId])

  const rawFeelingMeals = useMemo(() => getGalleryMealsForFeeling(feelingId), [feelingId])
  const feelingMeals = useMemo((): ExplorerMeal[] => {
    const source = feelingMealsFromDb.length > 0 ? feelingMealsFromDb : rawFeelingMeals
    return source
      .filter((meal) => {
        if (isDisliked(meal.base) || isDisliked(meal.protein) || isDisliked(meal.vegetable)) return false
        if (isNotToday(meal.base) || isNotToday(meal.protein) || isNotToday(meal.vegetable)) return false
        return true
      })
      .sort((a, b) => {
        const scoreA = [a.base, a.protein, a.vegetable].filter(id => isFavorite(id)).length
        const scoreB = [b.base, b.protein, b.vegetable].filter(id => isFavorite(id)).length
        return scoreB - scoreA
      })
      .map(m => ({ ...m, baseGroup: (m as ExplorerMeal).baseGroup ?? 'featured' }))
  }, [feelingMealsFromDb, rawFeelingMeals, isDisliked, isNotToday, isFavorite])

  const foodMeals = useMemo((): ExplorerMeal[] => {
    return foodMealsFromDb
      .filter((meal) => {
        if (isDisliked(meal.base) || isDisliked(meal.protein) || isDisliked(meal.vegetable)) return false
        if (isNotToday(meal.base) || isNotToday(meal.protein) || isNotToday(meal.vegetable)) return false
        return true
      })
      .sort((a, b) => {
        const scoreA = [a.base, a.protein, a.vegetable].filter(id => isFavorite(id)).length
        const scoreB = [b.base, b.protein, b.vegetable].filter(id => isFavorite(id)).length
        return scoreB - scoreA
      })
      .map(m => ({ ...m, baseGroup: (m as ExplorerMeal).baseGroup ?? 'featured' }))
  }, [foodMealsFromDb, isDisliked, isNotToday, isFavorite])

  const isFeelingMode = feelingId != null && feelingMeals.length > 0
  const isFoodMode = foodId != null
  const allItems: ExplorerMeal[] = isFeelingMode
    ? feelingMeals
    : isFoodMode
      ? foodMeals
      : (galleryMealsFromDb.length > 0 ? galleryMealsFromDb : sampleImages)

  const categoryOptions = useMemo(() => {
    const set = new Set<string>()
    allItems.forEach(m => { if (m.baseGroup) set.add(m.baseGroup) })
    return ['all', ...Array.from(set).sort((a, b) => (BASE_GROUP_LABELS[a] ?? a).localeCompare(BASE_GROUP_LABELS[b] ?? b))]
  }, [allItems])

  const methodOptions = useMemo(() => ['all', ...MEAL_COOKING_METHODS], [])

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return allItems.filter((meal) => {
      if (q) {
        const title = (meal.title ?? '').toLowerCase()
        const desc = (meal.description ?? '').toLowerCase()
        if (!title.includes(q) && !desc.includes(q)) return false
      }
      if (categoryFilter !== 'all' && meal.baseGroup !== categoryFilter) return false
      if (methodFilter !== 'all') {
        const mealMethodId = normalizeCookingMethodFromDb(meal.method ?? undefined)
        if (mealMethodId !== methodFilter) return false
      }
      return true
    })
  }, [allItems, searchQuery, categoryFilter, methodFilter])

  const feelingLabel = feelingId ? getFeelingById(feelingId)?.label : null
  const foodLabel = foodName ? `Meals with ${foodName}` : (foodId ? 'Meals with your pick' : null)
  const addSavedMeal = useCalendarStore(s => s.addSavedMeal)
  const savedMeals = useCalendarStore(s => s.savedMeals)
  const removeSavedMeal = useCalendarStore(s => s.removeSavedMeal)

  const getSavedMealIdForExplorerMeal = useMemo(() => {
    return (meal: ExplorerMeal): string | null => {
      const match = savedMeals.find((m) => {
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
    const hasIds = !!(meal.base && meal.protein && meal.vegetable)
    if (hasIds) {
      await addSavedMeal({
        title: meal.title,
        baseId: meal.base,
        proteinId: meal.protein,
        vegetableId: meal.vegetable,
        method: meal.method
      })
    } else {
      await addSavedMeal({
        title: meal.title,
        baseId: '11111111-1111-1111-1111-111111111101',
        proteinId: '22222222-2222-2222-2222-222222222201',
        vegetableId: '33333333-3333-3333-3333-333333333302',
        method: 'grilled'
      })
    }
    if (options?.shouldClose !== false) setSelectedMeal(null)
  }

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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isFeelingMode ? feelingLabel ?? 'Food Gallery' : isFoodMode ? foodLabel ?? 'Food Gallery' : 'Food Gallery'}
        </Text>
      </View>

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
                  (categoryDropdownOpen && { backgroundColor: colors.cardBorder })
                ]}
                onPress={() => {
                  setCategoryDropdownOpen((v) => !v)
                  setMethodDropdownOpen(false)
                  setSearchExpanded(false)
                }}
              >
                <Text style={[styles.filterBtnLabel, { color: colors.text }]} numberOfLines={1}>
                  {categoryFilter === 'all' ? 'Category' : (BASE_GROUP_LABELS[categoryFilter] ?? categoryFilter)}
                </Text>
                <ChevronDown size={16} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterBtn,
                  { backgroundColor: colors.secondaryBg },
                  (methodDropdownOpen && { backgroundColor: colors.cardBorder })
                ]}
                onPress={() => {
                  setMethodDropdownOpen((v) => !v)
                  setCategoryDropdownOpen(false)
                  setSearchExpanded(false)
                }}
              >
                <Text style={[styles.filterBtnLabel, { color: colors.text }]} numberOfLines={1}>
                  {methodFilter === 'all' ? 'Method' : getMethodDisplayPast(methodFilter)}
                </Text>
                <ChevronDown size={16} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterBtn, { backgroundColor: colors.secondaryBg }]}
                onPress={() => {
                  setSearchExpanded(true)
                  setCategoryDropdownOpen(false)
                  setMethodDropdownOpen(false)
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
                      {cat === 'all' ? 'All categories' : (BASE_GROUP_LABELS[cat] ?? cat)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {methodDropdownOpen && (
        <Modal visible transparent animationType="fade">
          <TouchableOpacity
            style={styles.dropdownBackdrop}
            activeOpacity={1}
            onPress={() => setMethodDropdownOpen(false)}
          >
            <View style={[styles.dropdownPanel, { backgroundColor: colors.card }]}>
              <ScrollView style={styles.dropdownScroll} keyboardShouldPersistTaps="handled">
                {methodOptions.map((method) => (
                  <TouchableOpacity
                    key={method}
                    style={[
                      styles.dropdownItem,
                      { borderBottomColor: colors.cardBorder },
                      methodFilter === method && { backgroundColor: colors.primary }
                    ]}
                    onPress={() => {
                      setMethodFilter(method)
                      setMethodDropdownOpen(false)
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        { color: colors.text },
                        methodFilter === method && styles.dropdownItemTextActive
                      ]}
                    >
                      {method === 'all' ? 'All methods' : getMethodDisplayPast(method)}
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
            <TouchableOpacity onPress={() => { closeDropdownsAndSearch(); setSearchQuery(''); setCategoryFilter('all'); setMethodFilter('all') }}>
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
            renderItem={({ item, index }) => (
              <MealCard
                meal={item}
                viewMode={viewMode}
                noMarginRight={numColumns > 1 && (index % numColumns) === numColumns - 1}
                onPress={() => { closeDropdownsAndSearch(); setSelectedMeal(item) }}
                onToggleWant={() => void toggleWantThis(item)}
                isAdded={getSavedMealIdForExplorerMeal(item) != null}
              />
            )}
          />
          )}

      <Modal visible={selectedMeal != null} transparent animationType="fade">
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalBackdrop}
          onPress={() => setSelectedMeal(null)}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedMeal(null)}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            {selectedMeal && (
              <>
                {selectedMeal.imageUrls?.[0]
                  ? (
                    <View style={styles.modalImageWrap}>
                      <Image source={{ uri: selectedMeal.imageUrls[0] }} style={styles.modalImage} resizeMode="cover" />
                      {selectedMeal.imageUrls.length > 1 && (
                        <View style={styles.modalImageStrip}>
                          {selectedMeal.imageUrls.slice(1, 3).map((url, idx) => (
                            <Image key={idx} source={{ uri: url }} style={styles.modalImageThumb} resizeMode="cover" />
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
                <ScrollView style={styles.modalScroll}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedMeal.title}</Text>
                  {selectedMeal.baseGroup && (
                    <Text style={[styles.modalCategory, { color: colors.primary }]}>{BASE_GROUP_LABELS[selectedMeal.baseGroup] ?? selectedMeal.baseGroup}</Text>
                  )}
                  <Text style={[styles.modalMethod, { color: colors.textMuted }]}>{getMethodDisplayPast(selectedMeal.method)}</Text>
                  {selectedMeal.description
                    ? <Text style={[styles.modalDesc, { color: colors.textMuted }]}>{selectedMeal.description}</Text>
                    : null}
                </ScrollView>
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
                    setSelectedMeal(null)
                    router.push({ pathname: '/recipe/[id]', params: { id: selectedMeal.id } })
                  }}
                >
                  <Text style={[styles.modalRecipeText, { color: colors.text }]}>Recipe</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
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
  filterBtnActive: {
    backgroundColor: '#334155'
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
  dropdownItemActive: {
    backgroundColor: '#22c55e'
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
    marginBottom: 4
  },
  cardImageWrap: {
    width: '100%',
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 4
  },
  cardImage: {
    width: '100%',
    height: '100%'
  },
  emojiText: { fontSize: 28 },
  cardTextWrap: {
    flex: 1
  },
  cardTextWrapList: {
    marginLeft: 12,
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
    maxHeight: '80%',
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
  modalImageThumb: {
    flex: 1,
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
    padding: PAD,
    maxHeight: 240
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4
  },
  modalCategory: {
    fontSize: 13,
    color: '#22c55e',
    marginBottom: 4
  },
  modalMethod: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 8
  },
  modalDesc: {
    fontSize: 14,
    color: '#cbd5e1',
    lineHeight: 20
  },
  modalWantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#22c55e',
    marginHorizontal: PAD,
    marginTop: PAD,
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
  }
})
