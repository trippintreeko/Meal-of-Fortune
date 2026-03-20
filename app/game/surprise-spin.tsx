import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform
} from 'react-native'
import { useRouter } from 'expo-router'
import { ChevronLeft, Heart, CalendarPlus, Share2, BookOpen } from 'lucide-react-native'
import { useThemeColors } from '@/hooks/useTheme'
import { useCalendarStore } from '@/store/calendar-store'
import OrbitalSpinWheel from '@/components/OrbitalSpinWheel'
import AddToCalendarModal from '@/components/calendar/AddToCalendarModal'
import type { SavedMeal } from '@/types/calendar'
import { useSystemBack } from '@/hooks/useSystemBack'

const SURPRISE_MEAL_COUNT = 20

export default function SurpriseSpinScreen () {
  const router = useRouter()
  const colors = useThemeColors()
  const surpriseSpinMeals = useCalendarStore((s) => s.surpriseSpinMeals)
  const setSurpriseSpinMeals = useCalendarStore((s) => s.setSurpriseSpinMeals)
  const savedMeals = useCalendarStore((s) => s.savedMeals)
  const addSavedMeal = useCalendarStore((s) => s.addSavedMeal)
  const addEvent = useCalendarStore((s) => s.addEvent)

  const [frontIndex, setFrontIndex] = useState(0)
  const [wheelActive, setWheelActive] = useState(false)
  const [showCalendarModal, setShowCalendarModal] = useState(false)

  const handleWheelInteractionStart = useCallback(() => setWheelActive(true), [])
  const handleWheelInteractionEnd = useCallback(() => setWheelActive(false), [])

  const handleBackToGallery = useCallback(() => {
    setSurpriseSpinMeals(null)
    router.back()
  }, [router, setSurpriseSpinMeals])

  useSystemBack(handleBackToGallery)

  useEffect(() => {
    return () => setSurpriseSpinMeals(null)
  }, [setSurpriseSpinMeals])

  const mealsToSpin = useMemo((): SavedMeal[] => {
    const list = surpriseSpinMeals ?? []
    if (list.length === 0) return []
    if (list.length >= 10) return list
    const multiplier = Math.floor(10 / list.length) + 1
    return Array.from({ length: multiplier }, () => list).flat()
  }, [surpriseSpinMeals])

  const handleSpinComplete = useCallback((selectedIndex: number) => {
    setFrontIndex(selectedIndex)
  }, [])

  const handleFrontIndexChange = useCallback((index: number) => {
    setFrontIndex(index)
  }, [])

  const selectedMeal = mealsToSpin.length > 0 ? mealsToSpin[frontIndex] ?? null : null

  const savedMealIdForSelected = useMemo(() => {
    if (!selectedMeal) return null
    const gid = (selectedMeal.id ?? '').trim()
    if (gid) {
      const byGallery = savedMeals.find((m) => (m.galleryMealId ?? '').trim() === gid)
      if (byGallery) return byGallery.id
    }
    const match = savedMeals.find(
      (m) =>
        !(m.galleryMealId ?? '').trim() &&
        (m.title ?? '').trim().toLowerCase() === (selectedMeal.title ?? '').trim().toLowerCase() &&
        (m.baseId ?? '') === (selectedMeal.baseId ?? '') &&
        (m.proteinId ?? '') === (selectedMeal.proteinId ?? '') &&
        (m.vegetableId ?? '') === (selectedMeal.vegetableId ?? '') &&
        (m.method ?? '') === (selectedMeal.method ?? '')
    )
    return match?.id ?? null
  }, [savedMeals, selectedMeal])

  const handleAddToList = useCallback(async () => {
    if (!selectedMeal) return
    await addSavedMeal({
      title: selectedMeal.title,
      baseId: selectedMeal.baseId,
      proteinId: selectedMeal.proteinId,
      vegetableId: selectedMeal.vegetableId,
      method: selectedMeal.method,
      galleryMealId: (selectedMeal.id ?? '').trim() || undefined
    })
  }, [selectedMeal, addSavedMeal])

  const handleAddToCalendarConfirm = useCallback(
    async (date: string, slot: import('@/types/calendar').MealSlot) => {
      if (!selectedMeal) return
      await addEvent({
        date,
        mealSlot: slot,
        savedMealId: savedMealIdForSelected ?? null,
        title: selectedMeal.title,
        baseId: selectedMeal.baseId,
        proteinId: selectedMeal.proteinId,
        vegetableId: selectedMeal.vegetableId,
        method: selectedMeal.method
      })
      setShowCalendarModal(false)
    },
    [selectedMeal, savedMealIdForSelected, addEvent]
  )

  const handleShareForVotes = useCallback(async () => {
    if (!selectedMeal) return
    let id = savedMealIdForSelected
    if (id == null) {
      const added = await addSavedMeal({
        title: selectedMeal.title,
        baseId: selectedMeal.baseId,
        proteinId: selectedMeal.proteinId,
        vegetableId: selectedMeal.vegetableId,
        method: selectedMeal.method,
        galleryMealId: (selectedMeal.id ?? '').trim() || undefined
      })
      id = added.id
    }
    router.push(`/social/share-to-vote?shareIds=${encodeURIComponent(id)}`)
  }, [selectedMeal, savedMealIdForSelected, addSavedMeal, router])

  const handleRecipe = useCallback(() => {
    if (!selectedMeal) return
    router.push({ pathname: '/recipe/[id]', params: { id: selectedMeal.id } })
  }, [selectedMeal, router])

  if (!surpriseSpinMeals?.length || mealsToSpin.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackToGallery}>
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Surprise Me</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No meals to spin</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Go back to the Food Gallery and tap "Surprise Me" to get a random set of meals to spin.
          </Text>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={handleBackToGallery}
          >
            <Text style={styles.primaryButtonText}>Back to Food Gallery</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackToGallery}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Surprise Me</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!wheelActive}
        bounces={!wheelActive}
        directionalLockEnabled={Platform.OS === 'ios'}
      >
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          You're spinning from {surpriseSpinMeals.length} random meals. Swipe the wheel or tap Spin.
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
            {selectedMeal?.title ?? ''}
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={handleAddToList}
          >
            <Heart size={20} color="#ffffff" fill={savedMealIdForSelected ? '#ffffff' : 'transparent'} />
            <Text style={styles.actionBtnText}>{savedMealIdForSelected ? 'Added' : 'Add to list'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.secondaryBg, borderColor: colors.cardBorder }]}
            onPress={() => setShowCalendarModal(true)}
          >
            <CalendarPlus size={20} color={colors.text} />
            <Text style={[styles.actionBtnTextSecondary, { color: colors.text }]}>Add to calendar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.secondaryBg, borderColor: colors.cardBorder }]}
            onPress={handleShareForVotes}
          >
            <Share2 size={20} color={colors.text} />
            <Text style={[styles.actionBtnTextSecondary, { color: colors.text }]}>Send to vote</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.secondaryBg, borderColor: colors.cardBorder }]}
            onPress={handleRecipe}
          >
            <BookOpen size={20} color={colors.text} />
            <Text style={[styles.actionBtnTextSecondary, { color: colors.text }]}>Recipe</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.backToGalleryBtn, { backgroundColor: colors.cardBorder }]}
          onPress={handleBackToGallery}
        >
          <Text style={[styles.backToGalleryText, { color: colors.textMuted }]}>Back to Food Gallery</Text>
        </TouchableOpacity>
      </ScrollView>

      <AddToCalendarModal
        visible={showCalendarModal}
        mealTitle={selectedMeal?.title ?? ''}
        onClose={() => setShowCalendarModal(false)}
        onConfirm={handleAddToCalendarConfirm}
      />
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
  actions: {
    marginTop: 20,
    gap: 10
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent'
  },
  actionBtnText: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
  actionBtnTextSecondary: { fontSize: 16, fontWeight: '600' },
  backToGalleryBtn: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center'
  },
  backToGalleryText: { fontSize: 15, fontWeight: '600' },
  emptyState: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  emptyText: { fontSize: 15, textAlign: 'center', marginBottom: 24 },
  primaryButton: { borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  primaryButtonText: { fontSize: 18, fontWeight: '700', color: '#ffffff' }
})
