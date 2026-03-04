import { useState, useEffect, useMemo, useCallback } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { useThemeColors } from '@/hooks/useTheme'
import { useCalendarStore } from '@/store/calendar-store'
import OrbitalSpinWheel from '@/components/OrbitalSpinWheel'
import type { SavedMeal } from '@/types/calendar'

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

  const mealsToSpin = useMemo((): SavedMeal[] => {
    if (spinMealIds != null && spinMealIds.length > 0) {
      const byId = new Map(savedMeals.map((m) => [m.id, m]))
      return spinMealIds.map((id) => byId.get(id)).filter(Boolean) as SavedMeal[]
    }
    return savedMeals
  }, [savedMeals, spinMealIds])

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

  if (mealsToSpin.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => (router.replace as (href: string) => void)('/')}>
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
        <TouchableOpacity style={styles.backButton} onPress={() => (router.replace as (href: string) => void)('/')}>
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
