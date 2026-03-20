import { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { Heart, X, Ban, ChevronLeft, Check, ChevronDown, ChevronRight } from 'lucide-react-native'
import { useThemeColors } from '@/hooks/useTheme'
import { useSocialAuth } from '@/hooks/useSocialAuth'
import { useProfileSettings } from '@/hooks/useProfileSettings'
import {
  DIETS,
  dietOnFavoritesOnlyAddsExclusions,
  getAllowedFoodNames,
  getExcludedFoodNames,
  getFoodIdsByNames
} from '@/lib/diets'
import { useFoodPreferencesStore, type PreferenceKind } from '@/store/food-preferences-store'

function endOfTodayISO (): string {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  d.setDate(d.getDate() + 1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

type PreferenceTab = PreferenceKind

type IngredientItem = {
  id: string
  name: string
}

type IngredientGroup = {
  groupKey: string
  displayName: string
  memberIds: string[]
  memberNames: string[]
}

function normalizeIngredientName (name: string): string {
  const base = (name ?? '')
    .toLowerCase()
    .trim()
    .replace(/[-–]/g, ' ')
    .replace(/\s+/g, ' ')
  if (!base) return ''

  // Canonicalize a few Spoonacular name variants we see so duplicates collapse into one button.
  const corrected = base
    .replace(/\bchesse\b/g, 'cheese')
    .replace(/\bmayonaise\b/g, 'mayonnaise')
    .replace(/\bmayonnaisse\b/g, 'mayonnaise')
    .replace(/\bvinegarrette\b/g, 'vinaigrette')
    .replace(/\byoghurt\b/g, 'yogurt')
    .replace(/\boysters sauce\b/g, 'oyster sauce')
    .replace(/^celery stalks?$/g, 'celery')
    .replace(/^package\s+artichoke hearts$/g, 'artichoke hearts')
    .replace(/^reduced fat mexican blend cheese$/g, 'mexican cheese')

  // If it's of the form "<single-word> cheese", group it under "<single-word>".
  const cheeseMatch = corrected.match(/^(.+?) cheese$/)
  if (cheeseMatch) {
    const head = (cheeseMatch[1] ?? '').trim()
    if (head && !head.includes(' ')) return head
  }

  return corrected
}

export default function PreferencesScreen () {
  const router = useRouter()
  const colors = useThemeColors()
  const { profile, refreshProfile } = useSocialAuth()
  const authId = profile?.auth_id ?? undefined
  const { updateProfile } = useProfileSettings(authId, profile, refreshProfile)
  const [loading, setLoading] = useState(true)
  const [ingredients, setIngredients] = useState<IngredientItem[]>([])

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
  } = useFoodPreferencesStore()

  const [selectedTab, setSelectedTab] = useState<PreferenceTab>('favorite')

  useEffect(() => {
    loadPreferences()
  }, [loadPreferences])

  useEffect(() => {
    loadIngredients()
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

  const loadIngredients = async () => {
    try {
      const { data, error } = await supabase
        .from('ingredient_assets')
        .select('spoonacular_ingredient_id, name')
        .order('name', { ascending: true })
      if (error) {
        setIngredients([])
      } else {
        const rows = (data ?? []) as { spoonacular_ingredient_id: number; name: string }[]
        setIngredients(rows.map(row => ({
          id: String(row.spoonacular_ingredient_id),
          name: row.name
        })))
      }
    } catch {
      setIngredients([])
    } finally {
      setLoading(false)
    }
  }

  const getSelectedIdsForTab = useCallback((tab: PreferenceTab) => {
    if (tab === 'favorite') return selectedFavoriteIds
    if (tab === 'dislike') return selectedDislikeIds
    return selectedNotTodayIds
  }, [selectedFavoriteIds, selectedDislikeIds, selectedNotTodayIds])

  const toggleIngredientGroup = useCallback((group: IngredientGroup) => {
    const memberSet = new Set(group.memberIds)

    const currentIds = getSelectedIdsForTab(selectedTab)
    const inCurrent = group.memberIds.some(id => currentIds.includes(id))

    if (inCurrent) {
      // Remove all member ids from the current preference list.
      const ids = currentIds.filter(id => !memberSet.has(id))
      if (selectedTab === 'favorite') void updateLists({ favoriteIds: ids })
      else if (selectedTab === 'dislike') void updateLists({ dislikeIds: ids })
      else void updateLists({ notTodayIds: ids })
      return
    }

    // Add all member ids to the current preference list, and remove them from the other lists.
    const uniq = (arr: string[]) => Array.from(new Set(arr))
    const newFav = selectedTab === 'favorite'
      ? uniq([...selectedFavoriteIds, ...group.memberIds])
      : selectedFavoriteIds.filter(id => !memberSet.has(id))
    const newDis = selectedTab === 'dislike'
      ? uniq([...selectedDislikeIds, ...group.memberIds])
      : selectedDislikeIds.filter(id => !memberSet.has(id))
    const newNot = selectedTab === 'never_today'
      ? uniq([...selectedNotTodayIds, ...group.memberIds])
      : selectedNotTodayIds.filter(id => !memberSet.has(id))

    void updateLists({ favoriteIds: newFav, dislikeIds: newDis, notTodayIds: newNot })
  }, [selectedTab, selectedFavoriteIds, selectedDislikeIds, selectedNotTodayIds, getSelectedIdsForTab, updateLists])

  const isDietApplied = useCallback((dietId: string) => {
    return appliedDietIds[selectedTab].includes(dietId)
  }, [selectedTab, appliedDietIds])

  const toggleDiet = useCallback((dietId: string) => {
    const tab = selectedTab
    const isApplied = appliedDietIds[tab].includes(dietId)

    if (tab === 'favorite' && dietOnFavoritesOnlyAddsExclusions(dietId)) {
      if (isApplied) {
        const newDietIds = appliedDietIds.favorite.filter(id => id !== dietId)
        void setAppliedDietIdsInStore('favorite', newDietIds)
      } else {
        void setAppliedDietIdsInStore('favorite', [...appliedDietIds.favorite, dietId])
      }
      return
    }

    const names = tab === 'favorite' ? getAllowedFoodNames(dietId) : getExcludedFoodNames(dietId)
    const ids = getFoodIdsByNames(ingredients, names)
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
  }, [selectedTab, ingredients, appliedDietIds, selectedFavoriteIds, selectedDislikeIds, selectedNotTodayIds, setAppliedDietIdsInStore, setFavorites, setDislikes, setNotToday])

  const ingredientGroups = (() => {
    const byId = new Map<string, IngredientItem>()
    for (const ing of ingredients) byId.set(ing.id, ing)
    const selected = new Set([...selectedFavoriteIds, ...selectedDislikeIds, ...selectedNotTodayIds])
    for (const id of selected) {
      if (!byId.has(id)) byId.set(id, { id, name: id })
    }

    const all = Array.from(byId.values())
      .sort((a, b) => a.name.localeCompare(b.name))

    const groupsByKey = new Map<string, { memberItems: IngredientItem[] }>()
    for (const ing of all) {
      const key = normalizeIngredientName(ing.name) || `id:${ing.id}`
      const bucket = groupsByKey.get(key) ?? { memberItems: [] }
      bucket.memberItems.push(ing)
      groupsByKey.set(key, bucket)
    }

    const groups: IngredientGroup[] = Array.from(groupsByKey.entries()).map(([groupKey, v]) => {
      const memberItems = v.memberItems
      const displayName = [...memberItems]
        .sort((a, b) => a.name.length - b.name.length || a.name.localeCompare(b.name))[0]?.name ?? groupKey
      const memberIds = memberItems.map(m => m.id)
      const memberNames = memberItems.map(m => m.name)
      return { groupKey, displayName, memberIds, memberNames }
    })

    // Sort by display name for consistent browsing.
    return groups.sort((a, b) => a.displayName.localeCompare(b.displayName))
  })()

  const headerKeyForIngredient = (name: string) => {
    const t = (name ?? '').trim()
    if (!t) return '#'
    const first = t[0].toUpperCase()
    if (first >= 'A' && first <= 'Z') return first
    return '#'
  }

  const groupedIngredients = ingredientGroups.reduce((acc, group) => {
    const key = headerKeyForIngredient(group.displayName)
    if (!acc[key]) acc[key] = []
    acc[key].push(group)
    return acc
  }, {} as Record<string, IngredientGroup[]>)

  const headerKeys = Object.keys(groupedIngredients).sort((a, b) => {
    if (a === '#') return 1
    if (b === '#') return -1
    return a.localeCompare(b)
  })

  const [openIngredientHeader, setOpenIngredientHeader] = useState<string | null>(null)

  useEffect(() => {
    if (!hydrated) return
    if (openIngredientHeader != null) return
    if (headerKeys.length === 0) return
    setOpenIngredientHeader(headerKeys[0])
  }, [hydrated, openIngredientHeader, headerKeys])

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
          Choose a type below, then tap ingredients to mark them. Tap again to remove.
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
              ? 'Tap a diet to add allowed foods to Favorites. Nut allergy hides meals with nuts (and similar) in lists — it does not add individual foods to Favorites.'
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

        <View>
          {headerKeys.map((key) => {
            const items = groupedIngredients[key] ?? []
            const isOpen = openIngredientHeader === key
            return (
              <View key={key} style={styles.categorySection}>
                <TouchableOpacity
                  style={styles.categoryHeaderRow}
                  onPress={() => setOpenIngredientHeader((v) => (v === key ? null : key))}
                >
                  <Text style={[styles.categoryTitle, { color: colors.textMuted }]}>
                    {key === '#' ? 'OTHER' : key}
                  </Text>
                  <View style={[styles.categoryCountPill, { borderColor: colors.border, backgroundColor: colors.card }]}>
                    <Text style={[styles.categoryCountText, { color: colors.textMuted }]}>{items.length}</Text>
                  </View>
                  {isOpen
                    ? <ChevronDown size={18} color={colors.textMuted} />
                    : <ChevronRight size={18} color={colors.textMuted} />}
                </TouchableOpacity>

                {isOpen && (
                  <View style={styles.foodGrid}>
                    {items.map((group) => {
                      const memberIds = group.memberIds
                      const memberHasFavorite = memberIds.some(id => selectedFavoriteIds.includes(id))
                      const memberHasDislike = memberIds.some(id => selectedDislikeIds.includes(id))
                      const memberHasNotToday = memberIds.some(id => selectedNotTodayIds.includes(id))
                      const status = memberHasFavorite
                        ? 'favorite'
                        : memberHasDislike
                          ? 'dislike'
                          : memberHasNotToday
                            ? 'never_today'
                            : null
                      const color = status ? selectors.find(s => s.id === status)?.color : undefined
                      return (
                        <TouchableOpacity
                          key={group.groupKey}
                          style={[
                            styles.foodItem,
                            { backgroundColor: colors.card, borderColor: colors.cardBorder },
                            color != null && {
                              borderColor: color,
                              borderWidth: 2,
                              backgroundColor: `${color}18`
                            }
                          ]}
                          onPress={() => toggleIngredientGroup(group)}
                        >
                          {status != null && color != null && (
                            <View style={[styles.checkBadge, { backgroundColor: color }]}>
                              <Check size={12} color="#ffffff" />
                            </View>
                          )}
                          <Text style={[styles.foodName, { color: colors.text }, color != null && { color }]}>
                            {group.displayName}
                          </Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                )}
              </View>
            )
          })}
        </View>
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
  categoryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1
  },
  categoryTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1
  },
  categoryCountPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1
  },
  categoryCountText: {
    fontSize: 12,
    fontWeight: '700'
  },
  foodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
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
