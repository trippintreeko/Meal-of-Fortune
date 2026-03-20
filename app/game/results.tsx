import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useThemeColors } from '@/hooks/useTheme'
import SwipeCard from '@/components/SwipeCard'
import { getMethodDisplayPast, normalizeCookingMethodFromDb } from '@/lib/cooking-methods'
import { useCalendarStore } from '@/store/calendar-store'
import { useFoodPreferencesStore } from '@/store/food-preferences-store'
import {
  fetchFoodNamesForPreferenceIds,
  fetchRecipeIngredientNamesMap,
  mealViolatesDislikesOnly,
  mergeFavoriteAppliedAllergyExcludedNames
} from '@/lib/meal-avoid-lists'
import { useGameSessionStore } from '@/store/game-session'
import { Trophy } from 'lucide-react-native'

/** One gallery meal as a swipe card: display fields + ids for saving */
type GalleryMealCard = {
  id: string
  title: string
  /** Ingredients/description line (from DB or built from base, protein, vegetable) */
  description: string
  preparedDisplay: string
  proteinDisplay: string
  vegetableDisplay: string
  seasonings: string[]
  garnishes: string[]
  baseId: string
  proteinId: string
  vegetableId: string
  method: string
  matchCount: number
  /** Spoonacular recipe image URL for card display */
  imageUrl?: string | null
}

type GalleryRow = {
  id: string
  title: string
  description: string | null
  base_id: string | null
  protein_id: string | null
  vegetable_id: string | null
  cooking_method: string | null
  spoonacular_recipe_id: number | null
}

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
  for (const [recipeId, set] of byRecipe.entries()) out.set(recipeId, [...set])
  return out
}

function getFilteredGalleryMeals (
  collectedFoodIds: string[],
  selectedMethodIds: string[],
  dislikeFoodIds: string[],
  notTodayFoodIds: string[],
  favoriteFoodIds: string[],
  recipeIngredientIdsByRecipeId: Map<number, string[]>,
  recipeIngredientNamesByRecipeId: Map<number, string[]>,
  dislikeNamesNormalized: Set<string>,
  galleryRows: GalleryRow[]
): Array<{ row: GalleryRow; matchCount: number }> {
  const dislikeSet = new Set(dislikeFoodIds)
  const notTodaySet = new Set(notTodayFoodIds)
  const favoriteSet = new Set(favoriteFoodIds)
  const collectedSet = new Set(collectedFoodIds)
  const methodSet = new Set(selectedMethodIds)

  const filtered = galleryRows.filter(row => {
    const base = row.base_id ?? ''
    const protein = row.protein_id ?? ''
    const vegetable = row.vegetable_id ?? ''
    const normalizedMethod = normalizeCookingMethodFromDb(row.cooking_method ?? undefined)
    // If no methods were selected (round 3 hidden), don't filter by cooking method.
    if (selectedMethodIds.length > 0 && !methodSet.has(normalizedMethod)) return false

    const recipeId = row.spoonacular_recipe_id
    const ingredientIds = recipeId != null ? recipeIngredientIdsByRecipeId.get(recipeId) ?? [] : []
    const ingredientNamesNormalized = recipeId != null ? recipeIngredientNamesByRecipeId.get(recipeId) ?? [] : []

    if (
      mealViolatesDislikesOnly(
        {
          title: row.title,
          description: row.description ?? '',
          ingredientIds,
          ingredientNamesNormalized,
          base,
          protein,
          vegetable
        },
        dislikeNamesNormalized,
        dislikeSet
      )
    ) {
      return false
    }

    const matchCandidateIds = ingredientIds.length > 0 ? ingredientIds : [base, protein, vegetable]
    const matchCount = matchCandidateIds.filter(id => collectedSet.has(id)).length
    // OR-match: show meals that contain any ingredient the user collected.
    if (matchCount < 1) return false

    // During a game run, we also add lots of "not today" ingredients for uncollected items.
    // That can eliminate almost every recipe unless we only block meals when they contain
    // something the player actually collected that they also don't want today.
    const hasNotTodayCollected = matchCandidateIds.some((id) => collectedSet.has(id) && notTodaySet.has(id))
    if (hasNotTodayCollected) return false
    return true
  })

  const scored = filtered.map(row => {
    const base = row.base_id ?? ''
    const protein = row.protein_id ?? ''
    const vegetable = row.vegetable_id ?? ''
    const recipeId = row.spoonacular_recipe_id
    const ingredientIds = recipeId != null ? recipeIngredientIdsByRecipeId.get(recipeId) ?? [] : []
    const matchCandidateIds = ingredientIds.length > 0 ? ingredientIds : [base, protein, vegetable]
    const matchCount = matchCandidateIds.filter(id => collectedSet.has(id)).length
    const favIds = new Set<string>([base, protein, vegetable, ...ingredientIds].filter(Boolean))
    const favoriteCount = Array.from(favIds).filter(id => favoriteSet.has(id)).length
    return { row, matchCount, favoriteCount }
  })

  scored.sort((a, b) => {
    if (b.favoriteCount !== a.favoriteCount) return b.favoriteCount - a.favoriteCount
    return b.matchCount - a.matchCount
  })
  return scored.map(({ row, matchCount }) => ({ row, matchCount }))
}

export default function ResultsScreen () {
  const router = useRouter()
  const colors = useThemeColors()
  const params = useLocalSearchParams<{ base?: string; protein?: string; vegetable?: string; method?: string }>()
  const addSavedMeal = useCalendarStore(s => s.addSavedMeal)
  const dislikeIds = useFoodPreferencesStore(s => s.dislikeIds)
  const notTodayIds = useFoodPreferencesStore(s => s.notTodayIds)
  const favoriteIds = useFoodPreferencesStore(s => s.favoriteIds)
  const appliedFavoriteDietIds = useFoodPreferencesStore(s => s.appliedDietIds.favorite)
  const setNotToday = useFoodPreferencesStore(s => s.setNotToday)
  const [loading, setLoading] = useState(true)
  const [missingParams, setMissingParams] = useState(false)
  const [networkError, setNetworkError] = useState(false)
  const [stage, setStage] = useState<'swipe' | 'complete'>('swipe')
  const [cards, setCards] = useState<GalleryMealCard[]>([])
  const [selectedCards, setSelectedCards] = useState<GalleryMealCard[]>([])
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [savedToStore, setSavedToStore] = useState(false)
  const [completedCount, setCompletedCount] = useState(0)

  const isNetworkFailure = (err: unknown) => {
    if (err instanceof TypeError && err.message === 'Network request failed') return true
    const msg = err && typeof (err as Error).message === 'string' ? (err as Error).message : ''
    return /network request failed|failed to fetch|network error/i.test(msg)
  }

  useEffect(() => {
    let cancelled = false
    setNetworkError(false)
    async function load () {
      try {
        const baseIds = (params.base ?? '').split(',').filter(Boolean)
        const proteinIds = (params.protein ?? '').split(',').filter(Boolean)
        const vegetableIds = (params.vegetable ?? '').split(',').filter(Boolean)
        if (baseIds.length === 0 || proteinIds.length === 0 || vegetableIds.length === 0) {
          if (!cancelled) setMissingParams(true)
          setLoading(false)
          return
        }
        const collected = [...baseIds, ...proteinIds, ...vegetableIds]
        const rawMethod = (params.method ?? '').trim()
        const methods = rawMethod
          ? [...new Set(rawMethod.split(',').map(m => normalizeCookingMethodFromDb(m.trim())).filter(Boolean))]
          : []
        const dislikeOnly = [...dislikeIds]
        const notTodayOnly = [...notTodayIds]

        const { data: galleryData, error: galleryError } = await supabase
          .from('gallery_meals')
          .select('id, title, description, base_id, protein_id, vegetable_id, cooking_method, spoonacular_recipe_id')
          .order('sort_order')

        if (cancelled) return
        if (galleryError) {
          if (isNetworkFailure(galleryError)) setNetworkError(true)
          else setCards([])
          setLoading(false)
          return
        }

        const rows = (galleryData ?? []) as GalleryRow[]

        const recipeIdsAll = [...new Set(rows.map((r) => r.spoonacular_recipe_id).filter((id): id is number => id != null))]
        const [recipeIngredientIdsMap, recipeIngredientNamesMap, dislikeNamesBase] = await Promise.all([
          fetchRecipeIngredientIdsMap(recipeIdsAll),
          fetchRecipeIngredientNamesMap(recipeIdsAll),
          fetchFoodNamesForPreferenceIds(dislikeOnly)
        ])
        const dislikeNamesNormalized = mergeFavoriteAppliedAllergyExcludedNames(
          dislikeNamesBase,
          appliedFavoriteDietIds
        )

        const scored = getFilteredGalleryMeals(
          collected,
          methods,
          dislikeOnly,
          notTodayOnly,
          favoriteIds,
          recipeIngredientIdsMap,
          recipeIngredientNamesMap,
          dislikeNamesNormalized,
          rows
        )

        const recipeIds = [...new Set(scored.map(({ row }) => row.spoonacular_recipe_id).filter((id): id is number => id != null))]
        const recipeImageMap = new Map<number, string>()
        if (recipeIds.length > 0) {
          const { data: recipeData } = await supabase
            .from('spoonacular_recipe_details')
            .select('spoonacular_recipe_id, image_url')
            .in('spoonacular_recipe_id', recipeIds)
          if (!cancelled && recipeData?.length) {
            for (const r of recipeData as Array<{ spoonacular_recipe_id: number; image_url: string | null }>) {
              if (r.image_url) recipeImageMap.set(r.spoonacular_recipe_id, r.image_url)
            }
          }
        }

        const allIds = new Set<string>()
        scored.forEach(({ row }) => {
          if (row.base_id) allIds.add(row.base_id)
          if (row.protein_id) allIds.add(row.protein_id)
          if (row.vegetable_id) allIds.add(row.vegetable_id)
        })
        const ids = Array.from(allIds)

        const nameMap: Record<string, string> = {}
        if (ids.length > 0) {
          const { data: foodData } = await supabase
            .from('food_items')
            .select('id, name')
            .in('id', ids)
          ;(foodData ?? []).forEach((r: { id: string; name: string }) => {
            nameMap[r.id] = r.name ?? ''
          })
        }

        const built: GalleryMealCard[] = scored.map(({ row, matchCount }) => {
          const baseDisplay = nameMap[row.base_id ?? ''] ?? ''
          const proteinDisplay = nameMap[row.protein_id ?? ''] ?? ''
          const vegetableDisplay = nameMap[row.vegetable_id ?? ''] ?? ''
          const fallbackDescription = [baseDisplay, proteinDisplay, vegetableDisplay].filter(Boolean).join(', ')
          const description = (row.description && row.description.trim()) ? row.description.trim() : fallbackDescription
          const imageUrl = row.spoonacular_recipe_id != null ? recipeImageMap.get(row.spoonacular_recipe_id) ?? null : null
          return {
            id: row.id,
            title: row.title,
            description,
            preparedDisplay: getMethodDisplayPast(row.cooking_method ?? undefined),
            proteinDisplay,
            vegetableDisplay,
            seasonings: [],
            garnishes: [],
            baseId: row.base_id ?? '',
            proteinId: row.protein_id ?? '',
            vegetableId: row.vegetable_id ?? '',
            method: row.cooking_method ?? 'grill',
            matchCount,
            imageUrl: imageUrl ?? undefined
          }
        })

        if (!cancelled) setCards(built)
      } catch (err) {
        if (!cancelled && isNetworkFailure(err)) setNetworkError(true)
        if (!cancelled) setCards([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [params.base, params.protein, params.vegetable, params.method, dislikeIds, appliedFavoriteDietIds])

  const saveSelectedToStore = async (toSave: GalleryMealCard[]) => {
    if (savedToStore) return
    for (const card of toSave) {
      await addSavedMeal({
        title: card.title,
        baseId: card.baseId,
        proteinId: card.proteinId,
        vegetableId: card.vegetableId,
        method: card.method,
        seasonings: [],
        garnishes: []
      })
    }
    setSavedToStore(true)
  }

  useEffect(() => {
    if (stage !== 'swipe' || cards.length === 0 || currentCardIndex < cards.length) return
    saveSelectedToStore(selectedCards).then(() => {
      setCompletedCount(selectedCards.length)
      setStage('complete')
    })
  }, [stage, cards.length, currentCardIndex, selectedCards])

  // When leaving results (unmount), remove game-added "don't want today" IDs so the list resets for the next play.
  useEffect(() => {
    return () => {
      const added = useGameSessionStore.getState().gameAddedNotTodayIds
      if (added.length === 0) return
      const current = useFoodPreferencesStore.getState().notTodayIds
      const next = current.filter((id) => !added.includes(id))
      void useFoodPreferencesStore.getState().setNotToday(next)
      useGameSessionStore.getState().setGameAddedNotTodayIds([])
    }
  }, [])

  const handleSwipe = (direction: 'left' | 'right') => {
    const currentCard = cards[currentCardIndex]
    const nextSelected = direction === 'right' ? [...selectedCards, currentCard] : selectedCards

    if (currentCardIndex < cards.length - 1) {
      setSelectedCards(nextSelected)
      setCurrentCardIndex(currentCardIndex + 1)
    } else {
      setSelectedCards(nextSelected)
      setCompletedCount(nextSelected.length)
      setCurrentCardIndex(cards.length)
      setStage('complete')
      saveSelectedToStore(nextSelected).catch(err => console.error('Save meals failed:', err))
    }
  }

  const finishSwipingEarly = () => {
    setCurrentCardIndex(cards.length)
  }

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading your meals...</Text>
      </View>
    )
  }

  if (missingParams) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>
          No matching meals. Try different ingredients.
        </Text>
        <TouchableOpacity style={[styles.homeButton, { backgroundColor: colors.primary }]} onPress={() => router.push('/')}>
          <Text style={styles.homeButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (cards.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Trophy size={64} color="#fbbf24" />
            <Text style={[styles.title, { color: colors.text }]}>Meal Plan Complete!</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              You saved 0 meals to Meals I want
            </Text>
          </View>
          <TouchableOpacity style={[styles.homeButton, { backgroundColor: colors.primary }]} onPress={() => router.replace('/')}>
            <Text style={styles.homeButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    )
  }

  if (stage === 'swipe') {
    const hasCardsToShow = currentCardIndex < cards.length
    if (!hasCardsToShow && cards.length > 0) {
      return (
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Finishing up...</Text>
        </View>
      )
    }

    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.swipeHeader}>
          <Text style={[styles.swipeTitle, { color: colors.text }]}>Swipe to Sort</Text>
          <Text style={[styles.swipeCounter, { color: colors.textMuted }]}>
            {currentCardIndex + 1} / {cards.length}
          </Text>
        </View>

        <View style={styles.cardsContainer} pointerEvents="box-none">
          {[currentCardIndex, currentCardIndex + 1]
            .filter(idx => idx >= 0 && idx < cards.length)
            .map(idx => {
              const card = cards[idx]
              const isTop = idx === currentCardIndex
              return (
                <SwipeCard
                  key={`${card.id}-${isTop ? 'top' : 'behind'}`}
                  cardDisplay={{
                    title: card.title,
                    description: card.description || undefined,
                    cookingMethod: card.preparedDisplay || undefined,
                    imageUrl: card.imageUrl ?? undefined
                  }}
                  onSwipe={handleSwipe}
                  isTop={isTop}
                  themeColors={colors}
                />
              )
            })}
        </View>

        <View style={styles.swipeInstructions}>
          <View style={styles.instructionItem}>
            <View style={[styles.instructionIcon, { backgroundColor: colors.destructive + '30' }]}>
              <Text style={styles.instructionEmoji}>👈</Text>
            </View>
            <Text style={[styles.instructionText, { color: colors.text }]}>Swipe left to skip</Text>
          </View>
          <View style={styles.instructionItem}>
            <View style={[styles.instructionIcon, { backgroundColor: colors.primary + '30' }]}>
              <Text style={styles.instructionEmoji}>👉</Text>
            </View>
            <Text style={[styles.instructionText, { color: colors.text }]}>Swipe right to save</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.finishSwipingButton, { backgroundColor: colors.secondaryBg }]}
          onPress={finishSwipingEarly}
          activeOpacity={0.7}
        >
          <Text style={[styles.finishSwipingText, { color: colors.textMuted }]}>Finish swiping — skip remaining & see results</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Trophy size={64} color="#fbbf24" />
          <Text style={[styles.title, { color: colors.text }]}>Meal Plan Complete!</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            You saved {completedCount} meal{completedCount !== 1 ? 's' : ''} to Meals I want
          </Text>
        </View>

        <View style={styles.savedMeals}>
          {selectedCards.map((card) => (
            <View key={card.id} style={[styles.savedMealCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
              <Text style={[styles.savedMealTitle, { color: colors.text }]}>{card.title}</Text>
              {card.description ? (
                <Text style={[styles.savedMealDetails, { color: colors.textMuted }]} numberOfLines={2}>{card.description}</Text>
              ) : null}
              {card.preparedDisplay ? (
                <Text style={[styles.savedMealMethod, { color: colors.primary }]}>Cooking method: {card.preparedDisplay}</Text>
              ) : null}
            </View>
          ))}
        </View>

        {completedCount > 0 && (
          <TouchableOpacity
            style={[styles.spinLink, { backgroundColor: colors.secondaryBg }]}
            onPress={() => router.replace('/game/spin')}
            activeOpacity={0.7}
          >
            <Text style={[styles.spinLinkText, { color: colors.secondary }]}>Still can't decide? Spin to pick one</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={[styles.homeButton, { backgroundColor: colors.primary }]} onPress={() => router.replace('/')}>
          <Text style={styles.homeButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, textAlign: 'center' },
  loadingSubtext: { marginTop: 8, fontSize: 14, textAlign: 'center', paddingHorizontal: 24, marginBottom: 16 },
  scrollContent: { padding: 20, paddingTop: 16 },
  header: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginTop: 16 },
  subtitle: { fontSize: 16, marginTop: 8, textAlign: 'center' },
  swipeHeader: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20, alignItems: 'center' },
  swipeTitle: { fontSize: 24, fontWeight: '700' },
  swipeCounter: { fontSize: 16, marginTop: 4 },
  cardsContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  swipeInstructions: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 20, paddingVertical: 24 },
  instructionItem: { alignItems: 'center' },
  instructionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8
  },
  instructionEmoji: { fontSize: 24 },
  instructionText: { fontSize: 14, fontWeight: '600' },
  finishSwipingButton: { marginHorizontal: 20, marginTop: 8, marginBottom: 24, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center' },
  finishSwipingText: { fontSize: 14, fontWeight: '600' },
  savedMeals: { gap: 12, marginBottom: 24 },
  savedMealCard: { borderRadius: 12, padding: 16, borderWidth: 2 },
  savedMealTitle: { fontSize: 18, fontWeight: '700', textTransform: 'capitalize' },
  savedMealDetails: { fontSize: 14, marginTop: 4 },
  savedMealMethod: { fontSize: 13, marginTop: 4, fontStyle: 'italic' },
  spinLink: { marginBottom: 12, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center' },
  spinLinkText: { fontSize: 14, fontWeight: '600' },
  homeButton: { borderRadius: 12, padding: 16, alignItems: 'center' },
  homeButtonText: { fontSize: 18, fontWeight: '700', color: '#ffffff' }
})
