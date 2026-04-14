import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  type TextStyle
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { Heart, X, Ban, ChevronLeft, Check, ChevronDown, ChevronRight, Search } from 'lucide-react-native'
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
import { HelpfulHint } from '@/components/HelpfulHint'
import { useHelpfulHints } from '@/hooks/useHelpfulHints'
import { useFoodPreferencesStore, type PreferenceKind } from '@/store/food-preferences-store'
import {
  getIngredientSearchMatchTerms,
  haystackMatchesAnyTerm
} from '@/lib/ingredient-search-groups'
import {
  normalizeIngredientName,
  preferenceIngredientLabel
} from '@/lib/preference-ingredient-labels'

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

function headerKeyForIngredient (name: string): string {
  const t = (name ?? '').trim()
  if (!t) return '#'
  const first = t[0].toUpperCase()
  if (first >= 'A' && first <= 'Z') return first
  return '#'
}

/** Extra space below the last ingredient row (chips + safe home indicator). */
const SCROLL_END_PADDING = 120

export default function PreferencesScreen () {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const colors = useThemeColors()
  const { isOff: helpfulHintsOff, isHydrated: helpfulHintsHydrated } = useHelpfulHints()
  const { profile, refreshProfile } = useSocialAuth()
  const authId = profile?.auth_id ?? undefined
  const { updateProfile } = useProfileSettings(authId, profile, refreshProfile)
  const [loading, setLoading] = useState(true)
  const [ingredients, setIngredients] = useState<IngredientItem[]>([])
  const [selectedLetter, setSelectedLetter] = useState<string>('')
  const [selectedSearchPageId, setSelectedSearchPageId] = useState<string>('primary')
  const [dietSectionOpen, setDietSectionOpen] = useState(false)
  const [ingredientSearch, setIngredientSearch] = useState('')

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
    if (!authId) return
    void updateProfile({
      dont_want_today: selectedNotTodayIds,
      dont_want_expires: endOfTodayISO()
    })
  }, [selectedNotTodayIds, authId, updateProfile])

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

  const ingredientGroups = useMemo(() => {
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
      const representativeRaw = [...memberItems]
        .sort((a, b) => a.name.length - b.name.length || a.name.localeCompare(b.name))[0]?.name ?? groupKey
      const displayName = preferenceIngredientLabel(representativeRaw)
      const memberIds = memberItems.map(m => m.id)
      const memberNames = memberItems.map(m => m.name)
      return { groupKey, displayName, memberIds, memberNames }
    })

    return groups.sort((a, b) => a.displayName.localeCompare(b.displayName))
  }, [ingredients, selectedFavoriteIds, selectedDislikeIds, selectedNotTodayIds])

  const searchTrim = ingredientSearch.trim().toLowerCase()

  const searchMatch = useMemo(
    () => getIngredientSearchMatchTerms(ingredientSearch),
    [ingredientSearch]
  )

  const groupedByLetter = useMemo(() => {
    return ingredientGroups.reduce((acc, group) => {
      const key = headerKeyForIngredient(group.displayName)
      if (!acc[key]) acc[key] = []
      acc[key].push(group)
      return acc
    }, {} as Record<string, IngredientGroup[]>)
  }, [ingredientGroups])

  const letterKeys = useMemo(() => {
    return Object.keys(groupedByLetter).sort((a, b) => {
      if (a === '#') return 1
      if (b === '#') return -1
      return a.localeCompare(b)
    })
  }, [groupedByLetter])

  /** Letter keys that contain at least one ingredient marked for the current tab (Favorites / Dislikes / Not Today). */
  const letterKeysWithSelectionForTab = useMemo(() => {
    const tabIds = new Set(getSelectedIdsForTab(selectedTab))
    if (tabIds.size === 0) return new Set<string>()
    const out = new Set<string>()
    for (const letter of letterKeys) {
      const groups = groupedByLetter[letter] ?? []
      for (const g of groups) {
        if (g.memberIds.some((id) => tabIds.has(id))) {
          out.add(letter)
          break
        }
      }
    }
    return out
  }, [groupedByLetter, letterKeys, selectedTab, selectedFavoriteIds, selectedDislikeIds, selectedNotTodayIds, getSelectedIdsForTab])

  const renderPreferencesHint = (text: string, hintStyle: TextStyle) => {
    if (!helpfulHintsHydrated || helpfulHintsOff) return null
    const baseStyle: TextStyle[] = [hintStyle, { color: colors.textMuted }]
    return <HelpfulHint text={text} textStyle={baseStyle} />
  }

  const openPreferenceList = useCallback((tab: PreferenceTab) => {
    router.push({
      pathname: '/profile/settings/preference-ingredient-list',
      params: { kind: tab }
    })
  }, [router])

  const searchPages = useMemo(() => {
    if (!searchTrim || searchMatch.terms.length === 0) return []
    const terms = searchMatch.terms
    const expandedHint =
      searchMatch.mode === 'expanded'
        ? 'Includes related ingredients for your search (e.g. tree nuts, not only the word “nuts”).'
        : 'Matches the grouped display name (what you usually see in lists).'
    const primary = ingredientGroups.filter((g) =>
      haystackMatchesAnyTerm(g.displayName, terms)
    )
    const aliasesOnly = ingredientGroups.filter((g) => {
      if (haystackMatchesAnyTerm(g.displayName, terms)) return false
      return g.memberNames.some((n) => haystackMatchesAnyTerm(n ?? '', terms))
    })
    const pages: { id: string; label: string; hint: string; groups: IngredientGroup[] }[] = []
    if (primary.length > 0) {
      pages.push({
        id: 'primary',
        label: 'Primary name',
        hint: expandedHint,
        groups: primary.sort((a, b) => a.displayName.localeCompare(b.displayName))
      })
    }
    if (aliasesOnly.length > 0) {
      pages.push({
        id: 'aliases',
        label: 'Other names',
        hint:
          searchMatch.mode === 'expanded'
            ? 'Related match on an alternate Spoonacular name, not the primary label.'
            : 'Matches an alternate Spoonacular name for the same ingredient, not the primary label.',
        groups: aliasesOnly.sort((a, b) => a.displayName.localeCompare(b.displayName))
      })
    }
    return pages
  }, [ingredientGroups, searchTrim, searchMatch])

  useEffect(() => {
    if (letterKeys.length === 0) {
      if (selectedLetter !== '') setSelectedLetter('')
      return
    }
    if (selectedLetter !== '' && !letterKeys.includes(selectedLetter)) {
      setSelectedLetter('')
    }
  }, [letterKeys, selectedLetter])

  useEffect(() => {
    if (!searchTrim) return
    if (searchPages.length === 0) return
    if (!searchPages.some((p) => p.id === selectedSearchPageId)) {
      setSelectedSearchPageId(searchPages[0].id)
    }
  }, [searchTrim, searchPages, selectedSearchPageId])

  const selectors: { id: PreferenceTab; label: string; icon: typeof Heart; color: string }[] = [
    { id: 'favorite', label: 'Favorites', icon: Heart, color: '#22c55e' },
    { id: 'dislike', label: 'Dislikes', icon: X, color: '#ef4444' },
    { id: 'never_today', label: 'Not Today', icon: Ban, color: '#f59e0b' }
  ]

  const selectorColor = selectors.find(s => s.id === selectedTab)?.color ?? '#94a3b8'

  const renderIngredientChips = (groups: IngredientGroup[]) => (
    <View style={styles.foodGrid}>
      {groups.map((group) => {
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
  )

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
        {renderPreferencesHint(
          'Choose a type, then tap ingredients to mark them. Long-press Favorites, Dislikes, or Not Today to open the full list for that type (remove items or clear all).',
          styles.selectorHint
        )}
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
                onPress={() => setSelectedTab(sel.id)}
                onLongPress={() => openPreferenceList(sel.id)}
                delayLongPress={450}
              >
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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + SCROLL_END_PADDING }
        ]}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        showsVerticalScrollIndicator
      >
        <View style={[styles.categorySection, { marginBottom: 16 }]}>
          <TouchableOpacity
            style={[styles.categoryHeaderRow, { borderColor: colors.border, backgroundColor: colors.secondaryBg }]}
            onPress={() => setDietSectionOpen((v) => !v)}
          >
            <Text style={[styles.categoryTitle, { color: colors.textMuted }]}>DIETARY RESTRICTIONS</Text>
            <View style={[styles.categoryCountPill, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Text style={[styles.categoryCountText, { color: colors.textMuted }]}>{DIETS.length}</Text>
            </View>
            {dietSectionOpen
              ? <ChevronDown size={18} color={colors.textMuted} />
              : <ChevronRight size={18} color={colors.textMuted} />}
          </TouchableOpacity>
          {dietSectionOpen && (
            <View style={styles.dietSectionBody}>
              {renderPreferencesHint(
                selectedTab === 'favorite'
                  ? 'Tap a diet to add allowed foods to Favorites. Nut allergy hides meals with nuts (and similar) in lists — it does not add individual foods to Favorites.'
                  : selectedTab === 'dislike'
                    ? 'Tap a diet to add or remove excluded foods from Dislikes.'
                    : 'Tap a diet to add or remove foods from Not Today.',
                styles.dietSectionHint
              )}
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
          )}
        </View>

        <View style={[styles.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Search size={20} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search ingredients…"
            placeholderTextColor={colors.placeholder}
            value={ingredientSearch}
            onChangeText={setIngredientSearch}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
        </View>

        {!searchTrim
          ? (
              <View>
                {renderPreferencesHint(
                  `Letters with a highlight include at least one ingredient marked for ${selectors.find((s) => s.id === selectedTab)?.label ?? 'this list'}. Tap a letter to browse; tap again to close.`,
                  styles.pagerHint
                )}
                {letterKeys.length === 0
                  ? (
                      <Text style={[styles.searchEmpty, { color: colors.textMuted }]}>
                        No ingredients loaded yet.
                      </Text>
                    )
                  : (
                      <>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.letterPagerScroll}
                  contentContainerStyle={styles.letterPagerContent}
                >
                  {letterKeys.map((key) => {
                    const count = (groupedByLetter[key] ?? []).length
                    const label = key === '#' ? '#' : key
                    const active = selectedLetter === key
                    const hasTabSelection = letterKeysWithSelectionForTab.has(key)
                    return (
                      <TouchableOpacity
                        key={key}
                        onPress={() => setSelectedLetter((prev) => (prev === key ? '' : key))}
                        style={[
                          styles.letterPill,
                          { borderColor: colors.border, backgroundColor: colors.card },
                          hasTabSelection && !active && {
                            borderColor: selectorColor,
                            borderWidth: 2,
                            backgroundColor: `${selectorColor}14`
                          },
                          active && { borderColor: selectorColor, backgroundColor: `${selectorColor}22` }
                        ]}
                        accessibilityLabel={`Letter ${label}, ${count} ingredients${hasTabSelection ? ', has marks for current list' : ''}`}
                      >
                        <Text
                          style={[
                            styles.letterPillText,
                            { color: colors.text },
                            active && { color: selectorColor, fontWeight: '800' }
                          ]}
                        >
                          {label}
                        </Text>
                        <View style={[styles.letterPillCount, { backgroundColor: colors.secondaryBg }]}>
                          <Text style={[styles.letterPillCountText, { color: colors.textMuted }]}>{count}</Text>
                        </View>
                      </TouchableOpacity>
                    )
                  })}
                </ScrollView>
                <View
                  style={[styles.pageHeaderCard, { borderColor: colors.border, backgroundColor: colors.secondaryBg }]}
                >
                  <Text style={[styles.pageHeaderTitle, { color: colors.text }]}>
                    {selectedLetter === ''
                      ? 'No letter selected'
                      : selectedLetter === '#'
                        ? 'Other'
                        : `Letter ${selectedLetter}`}
                  </Text>
                  <Text style={[styles.pageHeaderMeta, { color: colors.textMuted }]}>
                    {selectedLetter === ''
                      ? 'Tap a letter above to browse ingredients.'
                      : `${(groupedByLetter[selectedLetter] ?? []).length} ingredient${
                          (groupedByLetter[selectedLetter] ?? []).length === 1 ? '' : 's'
                        }`}
                  </Text>
                </View>
                {selectedLetter === ''
                  ? null
                  : renderIngredientChips(groupedByLetter[selectedLetter] ?? [])}
                      </>
                    )}
              </View>
            )
          : (
              <View>
                {searchPages.length === 0
                  ? (
                      <Text style={[styles.searchEmpty, { color: colors.textMuted }]}>
                        No ingredients match &quot;{ingredientSearch.trim()}&quot;
                      </Text>
                    )
                  : (
                      <>
                        {renderPreferencesHint(
                          `Where "${ingredientSearch.trim()}" was found${searchMatch.mode === 'expanded' ? ' (related foods included)' : ''} — swipe for more.`,
                          styles.pagerHint
                        )}
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          style={styles.letterPagerScroll}
                          contentContainerStyle={styles.letterPagerContent}
                        >
                          {searchPages.map((page) => {
                            const active = selectedSearchPageId === page.id
                            return (
                              <TouchableOpacity
                                key={page.id}
                                onPress={() => setSelectedSearchPageId(page.id)}
                                style={[
                                  styles.searchPagePill,
                                  { borderColor: colors.border, backgroundColor: colors.card },
                                  active && { borderColor: selectorColor, backgroundColor: `${selectorColor}22` }
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.searchPagePillLabel,
                                    { color: colors.text },
                                    active && { color: selectorColor, fontWeight: '800' }
                                  ]}
                                  numberOfLines={2}
                                >
                                  {page.label}
                                </Text>
                                <View style={[styles.letterPillCount, { backgroundColor: colors.secondaryBg }]}>
                                  <Text style={[styles.letterPillCountText, { color: colors.textMuted }]}>
                                    {page.groups.length}
                                  </Text>
                                </View>
                              </TouchableOpacity>
                            )
                          })}
                        </ScrollView>
                        {searchPages
                          .filter((p) => p.id === selectedSearchPageId)
                          .map((page) => (
                            <View key={page.id}>
                              <View
                                style={[styles.pageHeaderCard, { borderColor: colors.border, backgroundColor: colors.secondaryBg }]}
                              >
                                <Text style={[styles.pageHeaderTitle, { color: colors.text }]}>{page.label}</Text>
                                <Text style={[styles.pageHeaderHint, { color: colors.textMuted }]}>{page.hint}</Text>
                                <Text style={[styles.pageHeaderMeta, { color: colors.textMuted }]}>
                                  {page.groups.length} ingredient
                                  {page.groups.length === 1 ? '' : 's'}
                                </Text>
                              </View>
                              {renderIngredientChips(page.groups)}
                            </View>
                          ))}
                      </>
                    )}
              </View>
            )}
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
  scrollView: {
    flex: 1
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20
  },
  dietSectionBody: {
    marginTop: 12
  },
  dietSectionHint: { fontSize: 12, marginBottom: 12 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 20,
    gap: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
    minHeight: 40
  },
  searchEmpty: {
    fontSize: 14,
    marginTop: 12,
    fontStyle: 'italic'
  },
  pagerHint: {
    fontSize: 12,
    marginBottom: 10
  },
  letterPagerScroll: {
    marginBottom: 14,
    maxHeight: 52,
    flexGrow: 0
  },
  letterPagerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingRight: 8
  },
  letterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 2,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6
  },
  letterPillText: {
    fontSize: 15,
    fontWeight: '700'
  },
  letterPillCount: {
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8
  },
  letterPillCountText: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center'
  },
  searchPagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 2,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
    maxWidth: 220
  },
  searchPagePillLabel: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1
  },
  pageHeaderCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12
  },
  pageHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4
  },
  pageHeaderHint: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 6
  },
  pageHeaderMeta: {
    fontSize: 12,
    fontWeight: '600'
  },
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
  foodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 0 },
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
