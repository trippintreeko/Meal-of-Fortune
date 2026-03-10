import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronLeft, Search, Sparkles, Heart, X, Ban } from 'lucide-react-native'
import { useThemeColors } from '@/hooks/useTheme'
import { supabase } from '@/lib/supabase'
import { useGameSessionStore } from '@/store/game-session'
import { useFoodPreferencesStore } from '@/store/food-preferences-store'
import { FEELINGS } from '@/lib/feelings'
import type { FoodItem } from '@/types/database'
import { useSystemBack } from '@/hooks/useSystemBack'

const DEFAULT_MEAL_TYPE = 'lunch'

type FeelingTab = 'how' | 'what'

export default function FeelingScreen () {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const colors = useThemeColors()
  const setFeeling = useGameSessionStore(s => s.setFeeling)
  const mealType = useGameSessionStore(s => s.mealType)
  const startSession = useGameSessionStore(s => s.startSession)
  const [selectedTab, setSelectedTab] = useState<FeelingTab>('how')
  const [search, setSearch] = useState('')
  const [foods, setFoods] = useState<FoodItem[]>([])
  const [loadingFoods, setLoadingFoods] = useState(false)
  const loadPreferences = useFoodPreferencesStore(s => s.load)
  const getFoodStatus = useFoodPreferencesStore(s => s.getFoodStatus)

  const handleBackToHome = useCallback(() => {
    ;(router.replace as (href: string) => void)('/')
  }, [router])

  useSystemBack(handleBackToHome)

  useEffect(() => {
    if (mealType == null) {
      startSession(DEFAULT_MEAL_TYPE)
    }
  }, [mealType, startSession])

  useEffect(() => {
    loadPreferences()
  }, [loadPreferences])

  useEffect(() => {
    if (selectedTab !== 'what') return
    let cancelled = false
    setLoadingFoods(true)
    void (async () => {
      try {
        const { data, error } = await supabase
          .from('food_items')
          .select('id, name, category')
          .order('category', { ascending: true })
          .order('name', { ascending: true })
        if (cancelled) return
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
        if (!cancelled) setLoadingFoods(false)
      }
    })()
    return () => { cancelled = true }
  }, [selectedTab])

  const filteredFoods = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return foods
    return foods.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.category ?? '').toLowerCase().includes(q)
    )
  }, [foods, search])

  const groupedFoods = useMemo(() => {
    const acc: Record<string, FoodItem[]> = {}
    for (const food of filteredFoods) {
      const cat = food.category ?? 'other'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(food)
    }
    return acc
  }, [filteredFoods])

  const handleSelect = useCallback((feelingId: string) => {
    startSession(DEFAULT_MEAL_TYPE)
    setFeeling(feelingId)
    router.replace({ pathname: '/food-gallery', params: { feeling: feelingId } })
  }, [startSession, setFeeling, router])

  const handleSelectFood = useCallback((foodId: string) => {
    startSession(DEFAULT_MEAL_TYPE)
    setFeeling(null)
    router.replace({ pathname: '/food-gallery', params: { feeling: '', food: foodId } })
  }, [startSession, setFeeling, router])

  const handleSkip = useCallback(() => {
    setFeeling(null)
    router.replace({ pathname: '/food-gallery', params: { feeling: '' } })
  }, [setFeeling, router])

  if (mealType == null) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textMuted }]}>Loading…</Text>
      </View>
    )
  }

  const tabs: { id: FeelingTab; label: string }[] = [
    { id: 'how', label: 'How are you feeling?' },
    { id: 'what', label: 'What are you feeling?' }
  ]

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
            marginTop: -insets.top,
            paddingTop: insets.top + 16
          }
        ]}
      >
        <TouchableOpacity style={styles.backButton} onPress={handleBackToHome}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.title, { color: colors.text }]}>Feelings</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
            {selectedTab === 'how'
              ? 'Pick a vibe — we\'ll use it to steer your picks'
              : 'Search and tap a keyword'}
          </Text>
        </View>
      </View>

      <View style={[styles.tabs, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              selectedTab === tab.id && styles.tabActive
            ]}
            onPress={() => setSelectedTab(tab.id)}>
            <Text
              style={[
                styles.tabText,
                { color: colors.textMuted },
                selectedTab === tab.id && styles.tabTextActive
              ]}
              numberOfLines={1}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {selectedTab === 'how' ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {FEELINGS.map((feeling) => (
            <TouchableOpacity
              key={feeling.id}
              style={[styles.card, { borderLeftColor: feeling.color ?? colors.primary, borderColor: colors.cardBorder, backgroundColor: colors.card }]}
              onPress={() => handleSelect(feeling.id)}
              activeOpacity={0.7}>
              <View style={[styles.cardIcon, { backgroundColor: `${feeling.color ?? colors.primary}20` }]}>
                <Sparkles size={22} color={feeling.color ?? colors.primary} />
              </View>
              <View style={styles.cardText}>
                <Text style={[styles.cardLabel, { color: colors.text }]}>{feeling.label}</Text>
                <Text style={[styles.cardDescription, { color: colors.textMuted }]}>{feeling.description}</Text>
              </View>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={[styles.skipButtonText, { color: colors.textMuted }]}>Skip — no preference</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <>
          <View style={[styles.searchRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Search size={20} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search foods (beans, bread, cereal…)"
              placeholderTextColor={colors.placeholder}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          {loadingFoods ? (
            <View style={[styles.loadingWrap, { backgroundColor: colors.background }]}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading foods…</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}>
              {Object.entries(groupedFoods).map(([category, items]) => (
                <View key={category} style={styles.categorySection}>
                  <Text style={[styles.categoryTitle, { color: colors.textMuted }]}>{category.toUpperCase()}</Text>
                  <View style={styles.foodGrid}>
                    {items.map((food) => {
                      const status = getFoodStatus(food.id)
                      const statusConfig = status === 'favorite'
                        ? { color: colors.primary, Icon: Heart }
                        : status === 'dislike'
                          ? { color: colors.destructive, Icon: X }
                          : status === 'never_today'
                            ? { color: '#f59e0b', Icon: Ban }
                            : null
                      const StatusIcon = statusConfig?.Icon
                      return (
                        <TouchableOpacity
                          key={food.id}
                          style={[
                            styles.foodItem,
                            { backgroundColor: colors.card, borderColor: colors.cardBorder },
                            statusConfig != null && {
                              borderColor: statusConfig.color,
                              borderWidth: 2,
                              backgroundColor: `${statusConfig.color}18`
                            }
                          ]}
                          onPress={() => handleSelectFood(food.id)}
                          activeOpacity={0.7}>
                          {StatusIcon != null && statusConfig != null && (
                            <View style={[styles.foodStatusIcon, { backgroundColor: statusConfig.color }]}>
                              <StatusIcon size={12} color="#ffffff" />
                            </View>
                          )}
                          <Text style={[styles.foodName, { color: colors.text }, statusConfig != null && { color: statusConfig.color }]}>
                            {food.name}
                          </Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                </View>
              ))}
              {filteredFoods.length === 0 && !loadingFoods && (
                <Text style={[styles.noResults, { color: colors.textMuted }]}>
                  {'No foods match "' + search + '". Try something else.'}
                </Text>
              )}
              <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                <Text style={[styles.skipButtonText, { color: colors.textMuted }]}>Skip — no preference</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  backButton: {
    marginRight: 12
  },
  headerTextWrap: {
    flex: 1
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b'
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent'
  },
  tabActive: {
    borderBottomColor: '#22c55e'
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8'
  },
  tabTextActive: {
    color: '#22c55e'
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  searchIcon: {
    marginRight: 10
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
    paddingVertical: 10,
    paddingRight: 16
  },
  scroll: {
    flex: 1
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14
  },
  cardText: {
    flex: 1
  },
  cardLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b'
  },
  cardDescription: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2
  },
  keywordGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  keywordChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 2,
    maxWidth: '48%'
  },
  keywordIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  keywordLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b'
  },
  noResults: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 16,
    fontStyle: 'italic'
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 12
  },
  categorySection: {
    marginBottom: 20
  },
  categoryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 1,
    marginBottom: 10
  },
  foodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  foodItem: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0'
  },
  foodStatusIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8
  },
  foodName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b'
  },
  skipButton: {
    marginTop: 24,
    paddingVertical: 16,
    alignItems: 'center'
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b'
  },
  errorText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    padding: 24
  }
})
