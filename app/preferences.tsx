import { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { FoodItem } from '@/types/database'
import { Heart, X, Ban, ChevronLeft, Check } from 'lucide-react-native'
import { useThemeColors } from '@/hooks/useTheme'
import { useSocialAuth } from '@/hooks/useSocialAuth'
import { useProfileSettings } from '@/hooks/useProfileSettings'
import { DIETS, getAllowedFoodNames, getExcludedFoodNames, getFoodIdsByNames } from '@/lib/diets'
import { useFoodPreferencesStore, type PreferenceKind } from '@/store/food-preferences-store'

function endOfTodayISO (): string {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  d.setDate(d.getDate() + 1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

type PreferenceTab = PreferenceKind

export default function PreferencesScreen () {
  const router = useRouter()
  const colors = useThemeColors()
  const { profile, refreshProfile } = useSocialAuth()
  const authId = profile?.auth_id ?? undefined
  const { updateProfile } = useProfileSettings(authId, profile, refreshProfile)
  const [loading, setLoading] = useState(true)
  const [foods, setFoods] = useState<FoodItem[]>([])

  const {
    load: loadPreferences,
    hydrated,
    favoriteIds: selectedFavoriteIds,
    dislikeIds: selectedDislikeIds,
    notTodayIds: selectedNotTodayIds,
    appliedDietIds,
    setFavorites,
    setDislikes,
    setNotToday,
    setAppliedDietIds: setAppliedDietIdsInStore,
    updateLists,
    getFoodStatus
  } = useFoodPreferencesStore()

  const [selectedTab, setSelectedTab] = useState<PreferenceTab>('favorite')

  useEffect(() => {
    loadPreferences()
  }, [loadPreferences])

  useEffect(() => {
    loadFoods()
  }, [])

  useEffect(() => {
    if (!profile?.dont_want_today || !Array.isArray(profile.dont_want_today) || profile.dont_want_today.length === 0) return
    if (selectedNotTodayIds.length === 0) {
      void setNotToday(profile.dont_want_today)
    }
  }, [hydrated, profile?.dont_want_today, selectedNotTodayIds.length, setNotToday])

  useEffect(() => {
    if (!authId || !profile) return
    void updateProfile({
      dont_want_today: selectedNotTodayIds,
      dont_want_expires: endOfTodayISO()
    })
  }, [selectedNotTodayIds, authId, profile, updateProfile])

  const loadFoods = async () => {
    try {
      const { data, error } = await supabase
        .from('food_items')
        .select('id, name, category')
        .order('category', { ascending: true })
        .order('name', { ascending: true })

      if (error) {
        setFoods([])
      } else {
        const rows = (data ?? []) as { id: string; name: string; category: string }[]
        setFoods(rows.map(row => ({
          id: row.id,
          name: row.name,
          category: row.category as FoodItem['category'],
          created_at: ''
        })))
      }
    } catch {
      setFoods([])
    } finally {
      setLoading(false)
    }
  }

  const getSelectedIdsForTab = useCallback((tab: PreferenceTab) => {
    if (tab === 'favorite') return selectedFavoriteIds
    if (tab === 'dislike') return selectedDislikeIds
    return selectedNotTodayIds
  }, [selectedFavoriteIds, selectedDislikeIds, selectedNotTodayIds])

  const toggleFood = useCallback((foodId: string) => {
    const inFav = selectedFavoriteIds.includes(foodId)
    const inDis = selectedDislikeIds.includes(foodId)
    const inNot = selectedNotTodayIds.includes(foodId)
    const inCurrent = selectedTab === 'favorite' ? inFav : selectedTab === 'dislike' ? inDis : inNot
    if (inCurrent) {
      const ids = getSelectedIdsForTab(selectedTab).filter(id => id !== foodId)
      if (selectedTab === 'favorite') void updateLists({ favoriteIds: ids })
      else if (selectedTab === 'dislike') void updateLists({ dislikeIds: ids })
      else void updateLists({ notTodayIds: ids })
    } else {
      const newFav = selectedTab === 'favorite' ? [...selectedFavoriteIds, foodId] : selectedFavoriteIds.filter(id => id !== foodId)
      const newDis = selectedTab === 'dislike' ? [...selectedDislikeIds, foodId] : selectedDislikeIds.filter(id => id !== foodId)
      const newNot = selectedTab === 'never_today' ? [...selectedNotTodayIds, foodId] : selectedNotTodayIds.filter(id => id !== foodId)
      void updateLists({ favoriteIds: newFav, dislikeIds: newDis, notTodayIds: newNot })
    }
  }, [selectedTab, selectedFavoriteIds, selectedDislikeIds, selectedNotTodayIds, getSelectedIdsForTab, updateLists])

  const isDietApplied = useCallback((dietId: string) => {
    return appliedDietIds[selectedTab].includes(dietId)
  }, [selectedTab, appliedDietIds])

  const toggleDiet = useCallback((dietId: string) => {
    const tab = selectedTab
    const isApplied = appliedDietIds[tab].includes(dietId)
    const names = tab === 'favorite' ? getAllowedFoodNames(dietId) : getExcludedFoodNames(dietId)
    const ids = getFoodIdsByNames(foods, names)
    const idSet = new Set(ids)

    if (isApplied) {
      const newDietIds = appliedDietIds[tab].filter(id => id !== dietId)
      void setAppliedDietIdsInStore(tab, newDietIds)
      if (tab === 'favorite') void setFavorites(selectedFavoriteIds.filter(id => !idSet.has(id)))
      else if (tab === 'dislike') void setDislikes(selectedDislikeIds.filter(id => !idSet.has(id)))
      else void setNotToday(selectedNotTodayIds.filter(id => !idSet.has(id)))
    } else {
      const newDietIds = [...appliedDietIds[tab], dietId]
      void setAppliedDietIdsInStore(tab, newDietIds)
      if (tab === 'favorite') void setFavorites([...new Set([...selectedFavoriteIds, ...ids])])
      else if (tab === 'dislike') void setDislikes([...new Set([...selectedDislikeIds, ...ids])])
      else void setNotToday([...new Set([...selectedNotTodayIds, ...ids])])
    }
  }, [selectedTab, foods, appliedDietIds, selectedFavoriteIds, selectedDislikeIds, selectedNotTodayIds, setAppliedDietIdsInStore, setFavorites, setDislikes, setNotToday])

  const groupedFoods = foods.reduce((acc, food) => {
    if (!acc[food.category]) acc[food.category] = []
    acc[food.category].push(food)
    return acc
  }, {} as Record<string, FoodItem[]>)

  const selectors: { id: PreferenceTab; label: string; icon: typeof Heart; color: string }[] = [
    { id: 'favorite', label: 'Favorites', icon: Heart, color: '#22c55e' },
    { id: 'dislike', label: 'Dislikes', icon: X, color: '#ef4444' },
    { id: 'never_today', label: 'Not Today', icon: Ban, color: '#f59e0b' }
  ]

  const selectorColor = selectors.find(s => s.id === selectedTab)?.color ?? '#94a3b8'

  if (loading || !hydrated) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Food Preferences</Text>
      </View>

      <View style={[styles.selectorSection, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.selectorHint, { color: colors.textMuted }]}>
          Choose a type below, then tap foods to mark them. Tap again to remove.
        </Text>
        <View style={styles.selectors}>
          {selectors.map((sel) => {
            const Icon = sel.icon
            return (
              <TouchableOpacity
                key={sel.id}
                style={[
                  styles.selectorChip,
                  { borderColor: sel.color },
                  selectedTab === sel.id && { backgroundColor: sel.color }
                ]}
                onPress={() => setSelectedTab(sel.id)}>
                <Icon size={18} color={selectedTab === sel.id ? '#ffffff' : sel.color} />
                <Text
                  style={[
                    styles.selectorChipText,
                    { color: selectedTab === sel.id ? '#ffffff' : sel.color }
                  ]}>
                  {sel.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.dietSection}>
          <Text style={[styles.dietSectionTitle, { color: colors.text }]}>Dietary restrictions</Text>
          <Text style={[styles.dietSectionHint, { color: colors.textMuted }]}>
            {selectedTab === 'favorite'
              ? 'Tap a diet to add or remove allowed foods from Favorites.'
              : selectedTab === 'dislike'
                ? 'Tap a diet to add or remove excluded foods from Dislikes.'
                : 'Tap a diet to add or remove foods from Not Today.'}
          </Text>
          <View style={styles.dietChips}>
            {DIETS.map((diet) => {
              const applied = isDietApplied(diet.id)
              return (
                <TouchableOpacity
                  key={diet.id}
                  style={[
                    styles.dietChip,
                    { borderColor: selectorColor, backgroundColor: colors.card },
                    applied && { backgroundColor: selectorColor }
                  ]}
                  onPress={() => toggleDiet(diet.id)}>
                  <Text
                    style={[
                      styles.dietChipText,
                      { color: applied ? '#ffffff' : selectorColor }
                    ]}>
                    {diet.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {Object.entries(groupedFoods).map(([category, items]) => (
          <View key={category} style={styles.categorySection}>
            <Text style={[styles.categoryTitle, { color: colors.textMuted }]}>{category.toUpperCase()}</Text>
            <View style={styles.foodGrid}>
              {items.map((food) => {
                const status = getFoodStatus(food.id)
                const color = status ? selectors.find(s => s.id === status)?.color : undefined
                return (
                  <TouchableOpacity
                    key={food.id}
                    style={[
                      styles.foodItem,
                      { backgroundColor: colors.card, borderColor: colors.cardBorder },
                      color != null && {
                        borderColor: color,
                        borderWidth: 2,
                        backgroundColor: `${color}18`
                      }
                    ]}
                    onPress={() => toggleFood(food.id)}>
                    {status != null && color != null && (
                      <View style={[styles.checkBadge, { backgroundColor: color }]}>
                        <Check size={12} color="#ffffff" />
                      </View>
                    )}
                    <Text style={[styles.foodName, { color: colors.text }, color != null && { color }]}>
                      {food.name}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1
  },
  backButton: {
    marginRight: 12
  },
  title: { fontSize: 24, fontWeight: '700' },
  selectorSection: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1
  },
  selectorHint: { fontSize: 12, marginBottom: 12 },
  selectors: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  selectorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 2,
    gap: 6
  },
  selectorChipText: {
    fontSize: 14,
    fontWeight: '600'
  },
  content: {
    flex: 1,
    padding: 20
  },
  dietSection: {
    marginBottom: 24
  },
  dietSectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  dietSectionHint: { fontSize: 12, marginBottom: 12 },
  dietChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  dietChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 2
  },
  dietChipText: { fontSize: 13, fontWeight: '600' },
  categorySection: { marginBottom: 24 },
  categoryTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12
  },
  foodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  foodItem: {
    position: 'relative',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 2
  },
  checkBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center'
  },
  foodName: { fontSize: 14, fontWeight: '600' }
})
