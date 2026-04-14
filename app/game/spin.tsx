import { useState, useEffect, useMemo, useCallback } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { BookOpen, ChevronLeft } from 'lucide-react-native'
import { useThemeColors } from '@/hooks/useTheme'
import { useCalendarStore } from '@/store/calendar-store'
import OrbitalSpinWheel from '@/components/OrbitalSpinWheel'
import type { SavedMeal } from '@/types/calendar'
import { useSystemBack } from '@/hooks/useSystemBack'
import { supabase } from '@/lib/supabase'

export default function SpinScreen () {
  const router = useRouter()
  const colors = useThemeColors()
  const savedMeals = useCalendarStore((s) => s.savedMeals)
  const spinMealIds = useCalendarStore((s) => s.spinMealIds)
  const setSpinMealIds = useCalendarStore((s) => s.setSpinMealIds)
  const [spunIndex, setSpunIndex] = useState<number | null>(null)
  const [frontIndex, setFrontIndex] = useState(0)
  const [wheelActive, setWheelActive] = useState(false)

  const handleWheelInteractionStart = useCallback(() => setWheelActive(true), [])
  const handleWheelInteractionEnd = useCallback(() => setWheelActive(false), [])

  const handleBackToHome = useCallback(() => {
    ;(router.replace as (href: string) => void)('/')
  }, [router])

  useSystemBack(handleBackToHome)

  const mealsToSpinUnique = useMemo((): SavedMeal[] => {
    if (spinMealIds != null && spinMealIds.length > 0) {
      const byId = new Map(savedMeals.map((m) => [m.id, m]))
      return spinMealIds.map((id) => byId.get(id)).filter(Boolean) as SavedMeal[]
    }
    return savedMeals
  }, [savedMeals, spinMealIds])

  const mealsToSpin = useMemo((): SavedMeal[] => {
    const n = mealsToSpinUnique.length
    if (n === 0) return []
    if (n >= 10) return mealsToSpinUnique
    const multiplier = Math.floor(10 / n) + 1 // smallest k where n*k > 10
    return Array.from({ length: multiplier }, () => mealsToSpinUnique).flat()
  }, [mealsToSpinUnique])

  useEffect(() => {
    return () => setSpinMealIds(null)
  }, [setSpinMealIds])

  const handleSpinComplete = useCallback((selectedIndex: number) => {
    setSpunIndex(selectedIndex)
    setFrontIndex(selectedIndex)
  }, [])

  const handleFrontIndexChange = useCallback((index: number) => {
    setFrontIndex(index)
  }, [])

  const handleOpenRecipe = useCallback(() => {
    if (spunIndex == null) return
    const m = mealsToSpin[spunIndex]
    if (!m) return
    void (async () => {
      const tryId = (m.galleryMealId ?? m.id ?? '').trim()
      let gid = tryId || ''

      // If we have no linked galleryMealId, try to resolve it like the home UI does:
      // 1) by gallery_meals.id == savedMeal.id
      // 2) by matching base/protein/vegetable ids + title
      if (!gid) {
        gid = ''
      } else {
        const { data: byId } = await supabase
          .from('gallery_meals')
          .select('id')
          .eq('id', gid)
          .maybeSingle()
        if (!byId) gid = ''
      }

      if (!gid) {
        const title = (m.title ?? '').trim()
        if (title && m.baseId && m.proteinId && m.vegetableId) {
          const { data: rows, error } = await supabase
            .from('gallery_meals')
            .select('id')
            .eq('base_id', m.baseId)
            .eq('protein_id', m.proteinId)
            .eq('vegetable_id', m.vegetableId)
            .ilike('title', title)
            .limit(1)

          if (!error && rows?.[0]?.id) gid = rows[0].id
        }
      }

      if (gid) {
        router.push({
          pathname: '/recipe/[id]',
          params: { id: gid, savedMealId: m.id }
        })
        return
      }

      Alert.alert(
        'No recipe',
        'This meal doesn\'t have a linked gallery recipe. Open Food Gallery to find one with full ingredients and steps.'
      )
    })()
  }, [spunIndex, mealsToSpin, router])

  if (mealsToSpin.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackToHome}>
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Spin to pick</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No meals to spin</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Add meals to "Meals I want" on the home page first. Then come back here when you can't decide.
          </Text>
          <TouchableOpacity
            style={[styles.homeButton, { backgroundColor: colors.primary }]}
            onPress={() => (router.replace as (href: string) => void)('/(tabs)/')}>
            <Text style={styles.homeButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackToHome}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Spin to pick</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!wheelActive}
        bounces={!wheelActive}
        directionalLockEnabled={Platform.OS === 'ios'}
      >
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {spinMealIds != null && spinMealIds.length > 0
            ? 'Swipe the wheel up/down or tap Spin to land on one of your selected meals.'
            : 'Still can\'t decide? Swipe up/down or tap Spin to pick from your Meals I want list.'}
        </Text>

        <View onTouchStart={handleWheelInteractionStart}>
          <OrbitalSpinWheel
            meals={mealsToSpin}
            onSpinComplete={handleSpinComplete}
            onFrontIndexChange={handleFrontIndexChange}
            themeColors={colors}
            onInteractionStart={handleWheelInteractionStart}
            onInteractionEnd={handleWheelInteractionEnd}
          />
        </View>

        <View style={[styles.resultCard, { backgroundColor: colors.primary + '30' }]}>
          <Text style={[styles.resultLabel, { color: colors.primary }]}>You got</Text>
          <Text style={[styles.resultTitle, { color: colors.text }]}>
            {mealsToSpin[frontIndex]?.title ?? ''}
          </Text>
        </View>

        {spunIndex != null && (
          <TouchableOpacity
            style={[
              styles.recipeButton,
              { backgroundColor: colors.secondaryBg, borderColor: colors.cardBorder }
            ]}
            onPress={handleOpenRecipe}
            accessibilityRole="button"
            accessibilityLabel="Open recipe for this meal"
          >
            <BookOpen size={20} color={colors.text} />
            <Text style={[styles.recipeButtonText, { color: colors.text }]}>Recipe</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.homeButton, { backgroundColor: colors.primary }]}
          onPress={() => (router.replace as (href: string) => void)('/(tabs)/')}>
          <Text style={styles.homeButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1
  },
  backButton: { marginRight: 12 },
  title: { fontSize: 20, fontWeight: '700' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  subtitle: { fontSize: 15, textAlign: 'center', marginBottom: 24 },
  resultCard: {
    borderRadius: 12,
    padding: 20,
    marginTop: 24,
    alignItems: 'center'
  },
  resultLabel: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  resultTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  recipeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1
  },
  recipeButtonText: { fontSize: 16, fontWeight: '600' },
  emptyState: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  emptyText: { fontSize: 15, textAlign: 'center', marginBottom: 24 },
  homeButton: { borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  homeButtonText: { fontSize: 18, fontWeight: '700', color: '#ffffff' }
})
