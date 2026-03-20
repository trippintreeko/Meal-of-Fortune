import { useEffect, useCallback, useState, useMemo, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Alert,
  Animated,
  Easing,
  PanResponder,
  BackHandler,
  Platform,
  Image
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { useRouter } from 'expo-router'
import { setLastFocusedTabIndex, getLastFocusedTabIndex } from '@/lib/tab-transition'
import SwipeTabsContainer from '@/components/navigation/SwipeTabsContainer'
import {
  Calendar as CalendarIcon,
  UtensilsCrossed as MealOfTheDayIcon,
  Gamepad2,
  Sparkles,
  ChevronRight,
  UtensilsCrossed,
  Image as ImageIcon,
  Trash2,
  CalendarPlus,
  Share2,
  X,
  Check,
  Shuffle,
  CheckSquare,
  ShoppingCart
} from 'lucide-react-native'
import { useThemeColors } from '@/hooks/useTheme'
import { useSocialAuth } from '@/hooks/useSocialAuth'
import { useMealOfTheDay } from '@/hooks/useMealOfTheDay'
import { useCalendarStore } from '@/store/calendar-store'
import { useMealPhotosStore } from '@/store/meal-photos-store'
import { useGameSessionStore } from '@/store/game-session'
import { BannerMarqueeTitle } from '@/components/BannerMarqueeTitle'
import BatchAddToCalendarModal from '@/components/calendar/BatchAddToCalendarModal'
import AddToCalendarModal from '@/components/calendar/AddToCalendarModal'
import MealDetailModal from '@/components/MealDetailModal'
import { dateKey, formatShortDate, slotOrder } from '@/types/calendar'
import type { CalendarEvent, MealSlot, SavedMeal } from '@/types/calendar'
import { getEmptyMealsMessage } from '@/lib/empty-state-copy'
import { supabase } from '@/lib/supabase'

const SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner'
}

function savedMealRowSubtitle (meal: SavedMeal): string {
  const seasonings = meal.seasonings ?? []
  const garnishes = meal.garnishes ?? []
  const unique = [...new Set([...seasonings, ...garnishes])].filter(Boolean)
  if (unique.length === 0) return ''
  return unique.slice(0, 5).join(', ') + (unique.length > 5 ? '…' : '')
}

export default function HomeScreen () {
  const router = useRouter()
  const {
    savedMeals,
    events,
    load,
    hydrated,
    removeSavedMeal,
    addSavedMeal,
    addEvent,
    getSavedMeal,
    setSpinMealIds,
  } = useCalendarStore()

  const startSession = useGameSessionStore((s) => s.startSession)
  const { profile } = useSocialAuth()
  const { load: loadMealPhotos, getPhotoUrl } = useMealPhotosStore()

  useEffect(() => {
    void loadMealPhotos()
  }, [loadMealPhotos])

  const todayKey = useMemo(() => dateKey(new Date()), [])
  const todayEvents = useMemo(
    () => events.filter((e) => e.date === todayKey).sort((a, b) => slotOrder(a.mealSlot, b.mealSlot)),
    [events, todayKey]
  )
  const { bannerMeal, upcomingAfterBanner } = useMemo(() => {
    const upcoming = [...events]
      .filter((e) => e.date >= todayKey)
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date)
        return slotOrder(a.mealSlot, b.mealSlot)
      })
    const firstToday = todayEvents.length > 0 ? todayEvents[0] : null
    const banner = firstToday ?? (upcoming.length > 0 ? upcoming[0] : null)
    const bannerIndex = banner ? upcoming.findIndex((e) => e.id === banner.id) : -1
    const afterBanner = bannerIndex >= 0 ? upcoming.slice(bannerIndex + 1, bannerIndex + 4) : []
    return { bannerMeal: banner, upcomingAfterBanner: afterBanner }
  }, [events, todayKey, todayEvents])

  const [carouselIndex, setCarouselIndex] = useState(0)
  const carouselSize = upcomingAfterBanner.length
  const emptyMealsCopy = useMemo(() => getEmptyMealsMessage(), [])
  const emptyBtnAnims = useRef([0, 1, 2, 3].map(() => new Animated.Value(0))).current
  const hopAnims = useRef([0, 1, 2, 3].map(() => new Animated.Value(0))).current
  useEffect(() => {
    setCarouselIndex((i) => (carouselSize <= 1 ? 0 : i % carouselSize))
  }, [carouselSize])
  useEffect(() => {
    if (carouselSize <= 1) return
    const t = setInterval(() => {
      setCarouselIndex((i) => (i + 1) % carouselSize)
    }, 5000)
    return () => clearInterval(t)
  }, [carouselSize])

  const carouselPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => carouselSize > 1,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 15,
        onPanResponderRelease: (_, g) => {
          if (carouselSize <= 1) return
          const { dy } = g
          if (dy < -25) setCarouselIndex((i) => (i + 1) % carouselSize)
          else if (dy > 25) setCarouselIndex((i) => (i + carouselSize - 1) % carouselSize)
        }
      }),
    [carouselSize]
  )

  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const isSelectionModeRef = useRef(false)
  isSelectionModeRef.current = isSelectionMode
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBatchAddModal, setShowBatchAddModal] = useState(false)
  const [detailMeal, setDetailMeal] = useState<SavedMeal | null>(null)
  const [addToCalendarMeal, setAddToCalendarMeal] = useState<SavedMeal | null>(null)
  const [showMealOfTheDayModal, setShowMealOfTheDayModal] = useState(false)
  const [mealThumbnailMap, setMealThumbnailMap] = useState<Map<string, string>>(new Map())
  const [galleryMealThumbnailById, setGalleryMealThumbnailById] = useState<Map<string, string>>(new Map())

  const colors = useThemeColors()
  const { meal: mealOfTheDay, loading: mealOfTheDayLoading } = useMealOfTheDay()

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    let cancelled = false
    async function loadThumbnails () {
      const { data: galleryData } = await supabase
        .from('gallery_meals')
        .select('id, base_id, protein_id, vegetable_id, title, spoonacular_recipe_id, image_urls')
      if (cancelled || !galleryData?.length) return
      const recipeIds = [...new Set((galleryData as Array<{ spoonacular_recipe_id: number | null }>).map((r) => r.spoonacular_recipe_id).filter((id): id is number => id != null))]
      const urlByRecipeId = new Map<number, string>()
      if (recipeIds.length > 0) {
        const { data: recipeData } = await supabase
          .from('spoonacular_recipe_details')
          .select('spoonacular_recipe_id, image_url')
          .in('spoonacular_recipe_id', recipeIds)
        if (!cancelled && recipeData?.length) {
          for (const r of recipeData as Array<{ spoonacular_recipe_id: number; image_url: string | null }>) {
            if (r.image_url) urlByRecipeId.set(r.spoonacular_recipe_id, r.image_url)
          }
        }
      }
      const map = new Map<string, string>()
      const mapById = new Map<string, string>()
      for (const row of galleryData as Array<{
        id: string
        base_id: string | null
        protein_id: string | null
        vegetable_id: string | null
        title: string | null
        spoonacular_recipe_id: number | null
        image_urls: string[] | null
      }>) {
        const key = `${row.base_id ?? ''}|${row.protein_id ?? ''}|${row.vegetable_id ?? ''}|${(row.title ?? '').trim().toLowerCase()}`
        const recipeUrl = row.spoonacular_recipe_id != null ? urlByRecipeId.get(row.spoonacular_recipe_id) : undefined
        const galleryThumb = Array.isArray(row.image_urls) && row.image_urls.length > 0 ? row.image_urls[0] : undefined
        const thumbUrl = galleryThumb ?? recipeUrl
        if (thumbUrl) {
          map.set(key, thumbUrl)
          mapById.set(row.id, thumbUrl)
        }
      }
      if (!cancelled) setMealThumbnailMap(map)
      if (!cancelled) setGalleryMealThumbnailById(mapById)
    }
    void loadThumbnails()
    return () => { cancelled = true }
  }, [])

  useFocusEffect(
    useCallback(() => {
      setLastFocusedTabIndex(0) // Play tab index
      hopAnims.forEach((v) => v.setValue(0))
      const hopConfig = { tension: 200, friction: 10 }
      const hopStagger = 70
      const t = setTimeout(() => {
        hopAnims.forEach((v, i) => {
          Animated.spring(v, {
            toValue: 1,
            delay: i * hopStagger,
            useNativeDriver: true,
            ...hopConfig
          }).start()
        })
      }, 120)
      return () => {
        clearTimeout(t)
        setLastFocusedTabIndex(0)
      }
    }, [])
  )

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const enterSelectionMode = useCallback((firstId: string) => {
    setIsSelectionMode(true)
    setSelectedIds(new Set([firstId]))
  }, [])

  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false)
    setSelectedIds(new Set())
    setShowBatchAddModal(false)
  }, [])

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') {
        return () => {
          setIsSelectionMode(false)
          setSelectedIds(new Set())
          setShowBatchAddModal(false)
        }
      }
      const onBack = () => {
        if (isSelectionModeRef.current) {
          setIsSelectionMode(false)
          setSelectedIds(new Set())
          setShowBatchAddModal(false)
          return true
        }
        return false
      }
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack)
      return () => {
        sub.remove()
        setIsSelectionMode(false)
        setSelectedIds(new Set())
        setShowBatchAddModal(false)
      }
    }, [])
  )

  const handleDeleteSelected = useCallback(() => {
    const count = selectedIds.size
    Alert.alert(
      'Remove from Meals I want',
      `Remove ${count} meal${count === 1 ? '' : 's'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            for (const id of selectedIds) await removeSavedMeal(id)
            exitSelectionMode()
          }
        }
      ]
    )
  }, [selectedIds, removeSavedMeal, exitSelectionMode])

  const handleAddToCalendar = useCallback(() => {
    setShowBatchAddModal(true)
  }, [])

  const handleBatchAddConfirm = useCallback(
    async (dateKeyByMealId: Map<string, { date: string; slot: import('@/types/calendar').MealSlot }>) => {
      for (const [mealId, { date, slot }] of dateKeyByMealId) {
        const meal = getSavedMeal(mealId)
        if (!meal) continue
        await addEvent({
          date,
          mealSlot: slot,
          savedMealId: meal.id,
          title: meal.title,
          baseId: meal.baseId,
          proteinId: meal.proteinId,
          vegetableId: meal.vegetableId,
          method: meal.method
        })
      }
      exitSelectionMode()
    },
    [getSavedMeal, addEvent, exitSelectionMode]
  )

  const handleShareForVotes = useCallback(() => {
    const ids = Array.from(selectedIds).join(',')
    exitSelectionMode()
    router.push(`/social/share-to-vote?shareIds=${encodeURIComponent(ids)}`)
  }, [selectedIds, exitSelectionMode, router])

  const handleSpinSelected = useCallback(() => {
    if (selectedIds.size === 0) return
    setSpinMealIds(Array.from(selectedIds))
    exitSelectionMode()
    ;(router.push as (href: string) => void)('/game/spin')
  }, [selectedIds, setSpinMealIds, exitSelectionMode, router])

  const handleGrocerySelected = useCallback(() => {
    if (selectedIds.size === 0) return
    const mealIds = Array.from(selectedIds).join(',')
    exitSelectionMode()
    router.push({ pathname: '/grocery-list', params: { mode: 'multi', mealIds } })
  }, [selectedIds, exitSelectionMode, router])

  const handleOpenFullGrocery = useCallback(() => {
    router.push({ pathname: '/grocery-list', params: { mode: 'all' } })
  }, [router])

  const handleSingleAddToCalendarConfirm = useCallback(
    (date: string, slot: MealSlot) => {
      if (!addToCalendarMeal) return
      addEvent({
        date,
        mealSlot: slot,
        savedMealId: addToCalendarMeal.id,
        title: addToCalendarMeal.title,
        baseId: addToCalendarMeal.baseId,
        proteinId: addToCalendarMeal.proteinId,
        vegetableId: addToCalendarMeal.vegetableId,
        method: addToCalendarMeal.method
      })
      setAddToCalendarMeal(null)
    },
    [addToCalendarMeal, addEvent]
  )

  const mealsListSorted = useMemo(
    () => [...savedMeals].sort((a, b) => b.createdAt - a.createdAt),
    [savedMeals]
  )
  const selectedMeals = savedMeals.filter((m) => selectedIds.has(m.id))

  const PLAY_TAB_INDEX = 0
  const MEALS_SLIDE_OFFSET = -80
  const [mealsSlideFromX, setMealsSlideFromX] = useState(80)
  const mealsSlideAnims = useRef<Animated.Value[]>([])
  const listLen = mealsListSorted.length
  while (mealsSlideAnims.current.length < listLen) {
    mealsSlideAnims.current.push(new Animated.Value(0)) // 0 = invisible + off to side, 1 = visible + in place
  }

  useFocusEffect(
    useCallback(() => {
      const prev = getLastFocusedTabIndex()
      const direction = PLAY_TAB_INDEX - prev
      const fromX = direction > 0 ? MEALS_SLIDE_OFFSET : direction < 0 ? -MEALS_SLIDE_OFFSET : MEALS_SLIDE_OFFSET
      setMealsSlideFromX(fromX)
      const vals = mealsSlideAnims.current
      const anims = vals.slice(0, listLen).map((v, i) =>
        Animated.timing(v, {
          toValue: 1,
          duration: 320,
          delay: i * 55,
          useNativeDriver: true,
          easing: Easing.bezier(0.42, 0, 0.58, 1)
        })
      )
      if (anims.length > 0) Animated.parallel(anims).start()
      return () => {
        vals.slice(0, listLen).forEach((v) => v.setValue(0))
      }
    }, [listLen])
  )

  const isMealsEmpty = hydrated && savedMeals.length === 0
  useEffect(() => {
    if (!isMealsEmpty) {
      emptyBtnAnims.forEach((v) => v.setValue(0))
      return
    }
    const springConfig = { tension: 180, friction: 12 }
    emptyBtnAnims.forEach((v, i) => {
      Animated.spring(v, {
        toValue: 1,
        delay: i * 80,
        useNativeDriver: true,
        ...springConfig
      }).start()
    })
  }, [isMealsEmpty])

  const mealOfTheDayAsSaved = useMemo((): SavedMeal | null => {
    if (!mealOfTheDay) return null
    const base = mealOfTheDay.base || '11111111-1111-1111-1111-111111111101'
    const protein = mealOfTheDay.protein || '22222222-2222-2222-2222-222222222201'
    const vegetable = mealOfTheDay.vegetable || '33333333-3333-3333-3333-333333333302'
    return {
      id: mealOfTheDay.id,
      title: mealOfTheDay.title,
      baseId: base,
      proteinId: protein,
      vegetableId: vegetable,
      method: mealOfTheDay.method || 'grilled',
      createdAt: 0
    }
  }, [mealOfTheDay])

  const handleMealOfTheDayPress = useCallback(() => {
    if (mealOfTheDayLoading) return
    if (!mealOfTheDay) {
      Alert.alert('No meal today', 'The food gallery has no meals right now. Try again later.')
      return
    }
    setShowMealOfTheDayModal(true)
  }, [mealOfTheDay, mealOfTheDayLoading])

  const handleMealOfTheDayFavorite = useCallback(
    async (meal: SavedMeal) => {
      await addSavedMeal({
        title: meal.title,
        baseId: meal.baseId,
        proteinId: meal.proteinId,
        vegetableId: meal.vegetableId,
        method: meal.method,
        galleryMealId: (meal.id ?? '').trim() || undefined
      })
      setShowMealOfTheDayModal(false)
    },
    [addSavedMeal]
  )

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(savedMeals.map((m) => m.id)))
  }, [savedMeals])

  return (
    <SwipeTabsContainer tabIndex={0}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.main}>
          <View style={styles.banner}>
            <View style={styles.bannerHeader}>
              <CalendarIcon size={24} color="#ffffff" />
              <Text style={styles.bannerTitle}>Meal for today</Text>
            </View>
            {!bannerMeal ? (
              <TouchableOpacity
                style={styles.bannerEvent}
                onPress={() => router.push('/(tabs)/calendar')}
                activeOpacity={0.8}
              >
                <Text style={styles.bannerEventLabel}>Nothing planned</Text>
                <ChevronRight size={20} color="rgba(255,255,255,0.8)" />
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.bannerEvent}
                  onPress={() => router.push('/(tabs)/calendar')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.bannerEventSlot}>
                    {SLOT_LABEL[bannerMeal.mealSlot]}
                  </Text>
                  <View style={styles.bannerEventTitleWrap}>
                    <BannerMarqueeTitle text={bannerMeal.title} style={styles.bannerEventLabelText} />
                  </View>
                  <Text style={styles.bannerEventDate}>
                    {bannerMeal.date === todayKey
                      ? 'Today'
                      : formatShortDate(bannerMeal.date)}
                  </Text>
                  <ChevronRight size={20} color="rgba(255,255,255,0.8)" />
                </TouchableOpacity>
                {upcomingAfterBanner.length > 0 && (
                  <View style={styles.carouselWrap} {...carouselPan.panHandlers}>
                    <TouchableOpacity
                      style={styles.carouselCard}
                      onPress={() => router.push('/(tabs)/calendar')}
                      activeOpacity={0.9}
                    >
                      <Text style={styles.carouselCardDay}>
                        {formatShortDate(upcomingAfterBanner[carouselIndex].date)}
                      </Text>
                      <Text style={styles.carouselCardSlot}>
                        {SLOT_LABEL[upcomingAfterBanner[carouselIndex].mealSlot]}
                      </Text>
                      <BannerMarqueeTitle
                        text={upcomingAfterBanner[carouselIndex].title}
                        style={styles.carouselCardLabel}
                      />
                    </TouchableOpacity>
                    {upcomingAfterBanner.length > 1 && (
                      <View style={styles.carouselDotsRight}>
                        {upcomingAfterBanner.map((_, i) => (
                          <View
                            key={i}
                            style={[
                              styles.carouselDot,
                              i === carouselIndex && styles.carouselDotActive
                            ]}
                          />
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </>
            )}
          </View>

        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Meals I want</Text>
          </View>
          <ScrollView
            style={styles.mealsList}
            contentContainerStyle={styles.mealsListContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            {!hydrated ? null : savedMeals.length === 0 ? (
              <View style={styles.emptyStateWrap}>
                <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>{emptyMealsCopy}</Text>
                <View style={styles.emptyStateButtons}>
                  {[
                    { label: 'Meal of\nthe day', Icon: MealOfTheDayIcon, style: styles.sideButtonMealOfTheDay, onPress: handleMealOfTheDayPress, disabled: mealOfTheDayLoading },
                    { label: 'Mini\ngame', Icon: Gamepad2, style: styles.sideButtonGames, onPress: () => { startSession('lunch'); router.replace('/game/round/0') } },
                    { label: 'Feelings', Icon: Sparkles, style: styles.sideButtonFeelings, onPress: () => router.push('/game/feeling') },
                    { label: 'Food\ngallery', Icon: ImageIcon, style: styles.sideButtonGallery, onPress: () => router.push('/food-gallery') }
                  ].map((btn, i) => {
                    const Icon = btn.Icon
                    return (
                      <Animated.View
                        key={i}
                        style={{
                          opacity: emptyBtnAnims[i],
                          transform: [
                            {
                              translateX: emptyBtnAnims[i].interpolate({
                                inputRange: [0, 1],
                                outputRange: [72, 0]
                              })
                            },
                            {
                              scale: emptyBtnAnims[i].interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.85, 1]
                              })
                            },
                            {
                              translateY: hopAnims[i].interpolate({
                                inputRange: [0, 0.35, 1],
                                outputRange: [0, -14, 0]
                              })
                            }
                          ]
                        }}>
                        <TouchableOpacity
                          style={[styles.emptyStateBtn, btn.style]}
                          onPress={btn.onPress}
                          disabled={btn.disabled}
                          activeOpacity={0.8}>
                          <Icon size={28} color="#ffffff" />
                          <Text style={styles.sideButtonLabel}>{btn.label}</Text>
                        </TouchableOpacity>
                      </Animated.View>
                    )
                  })}
                </View>
              </View>
            ) : (
              mealsListSorted.map((meal, index) => {
                const anySelected = selectedIds.has(meal.id)
                const progress = mealsSlideAnims.current[index]
                const rowSubtitle = savedMealRowSubtitle(meal)
                return (
                  <Animated.View
                    key={meal.id}
                    style={
                      progress
                        ? {
                            opacity: progress,
                            transform: [
                              {
                                translateX: progress.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [mealsSlideFromX, 0]
                                })
                              }
                            ]
                          }
                        : undefined
                    }>
                    <Pressable
                      style={({ pressed }) => [
                        styles.mealRow,
                        { backgroundColor: colors.card, borderColor: colors.cardBorder },
                        anySelected && styles.mealRowSelected,
                        pressed && !isSelectionMode && styles.mealRowPressed
                      ]}
                      onPress={() => {
                        if (isSelectionMode) toggleSelect(meal.id)
                        else setDetailMeal(meal)
                      }}
                      onLongPress={() => {
                        if (!isSelectionMode) {
                          setIsSelectionMode(true)
                          setSelectedIds(new Set([meal.id]))
                        }
                      }}
                      delayLongPress={500}>
                      {isSelectionMode ? (
                        <View style={[styles.mealRowCheck, anySelected && styles.mealRowCheckSelected]}>
                          {anySelected && <Check size={18} color="#ffffff" />}
                        </View>
                      ) : (() => {
                        const photoUrl = getPhotoUrl(meal.id)
                        const galleryThumbUrl = meal.galleryMealId
                          ? galleryMealThumbnailById.get(String(meal.galleryMealId).trim())
                          : undefined
                        const recipeThumb = mealThumbnailMap.get(`${meal.baseId}|${meal.proteinId}|${meal.vegetableId}|${(meal.title ?? '').trim().toLowerCase()}`)
                        const thumbUrl = photoUrl || galleryThumbUrl || recipeThumb
                        return thumbUrl
                          ? <Image source={{ uri: thumbUrl }} style={styles.mealRowThumb} resizeMode="cover" />
                          : <UtensilsCrossed size={20} color={colors.textMuted} />
                      })()}
                      <View style={styles.mealRowTextWrap}>
                        <Text style={[styles.mealRowLabel, { color: colors.text }]}>{meal.title}</Text>
                        {rowSubtitle ? (
                          <Text style={[styles.mealRowSubtitle, { color: colors.textMuted }]} numberOfLines={1}>{rowSubtitle}</Text>
                        ) : null}
                      </View>
                      {!isSelectionMode && <ChevronRight size={18} color={colors.textMuted} />}
                    </Pressable>
                  </Animated.View>
                )
              })
            )}
          </ScrollView>

          {!isSelectionMode && hydrated && savedMeals.length > 0 && (
            <View style={styles.decisionRow}>
              <TouchableOpacity
                style={[styles.spinLink, styles.decisionBtnHalf, { backgroundColor: colors.secondaryBg }]}
                onPress={() => router.push('/game/spin')}
                activeOpacity={0.7}>
                <Text style={[styles.spinLinkText, { color: colors.secondary }]}>Still can't decide? Spin to pick one</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.fullGroceryBtn, styles.decisionBtnHalf, { backgroundColor: colors.secondaryBg, borderColor: colors.cardBorder }]}
                onPress={handleOpenFullGrocery}
                activeOpacity={0.85}
                accessibilityLabel="Open full grocery list"
              >
                <ShoppingCart size={18} color={colors.primary} />
                <Text style={[styles.fullGroceryBtnText, { color: colors.text }]}>Full grocery list</Text>
              </TouchableOpacity>
            </View>
          )}

          {isSelectionMode && (
            <View style={[styles.actionBar, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={styles.actionBarCancel}
                onPress={exitSelectionMode}>
                <X size={20} color={colors.textMuted} />
                <Text style={[styles.actionBarCancelText, { color: colors.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <View style={styles.actionBarActions}>
                <TouchableOpacity
                  style={[styles.actionBarBtn, { backgroundColor: colors.secondaryBg }]}
                  onPress={handleDeleteSelected}
                  disabled={selectedIds.size === 0}>
                  <Trash2 size={20} color={selectedIds.size === 0 ? colors.textMuted : colors.destructive} />
                  <Text style={[styles.actionBarBtnText, { color: colors.text }, selectedIds.size === 0 && { color: colors.textMuted }]}>
                    Delete
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBarBtn, { backgroundColor: colors.secondaryBg }]}
                  onPress={handleAddToCalendar}
                  disabled={selectedIds.size === 0}>
                  <CalendarPlus size={20} color={selectedIds.size === 0 ? colors.textMuted : colors.primary} />
                  <Text style={[styles.actionBarBtnText, { color: colors.text }, selectedIds.size === 0 && { color: colors.textMuted }]}>
                    Add to calendar
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBarBtn, { backgroundColor: colors.secondaryBg }]}
                  onPress={handleShareForVotes}
                  disabled={selectedIds.size === 0}>
                  <Share2 size={20} color={selectedIds.size === 0 ? colors.textMuted : colors.secondary} />
                  <Text style={[styles.actionBarBtnText, { color: colors.text }, selectedIds.size === 0 && { color: colors.textMuted }]}>
                    Share for votes
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBarBtn, { backgroundColor: colors.secondaryBg }]}
                  onPress={handleGrocerySelected}
                  disabled={selectedIds.size === 0}>
                  <ShoppingCart size={20} color={selectedIds.size === 0 ? colors.textMuted : colors.primary} />
                  <Text style={[styles.actionBarBtnText, { color: colors.text }, selectedIds.size === 0 && { color: colors.textMuted }]}>
                    Grocery list
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBarBtn, { backgroundColor: colors.secondaryBg }]}
                  onPress={handleSpinSelected}
                  disabled={selectedIds.size === 0}>
                  <Shuffle size={20} color={selectedIds.size === 0 ? colors.textMuted : '#f59e0b'} />
                  <Text style={[styles.actionBarBtnText, { color: colors.text }, selectedIds.size === 0 && { color: colors.textMuted }]}>
                    Spin to pick
                  </Text>
                </TouchableOpacity>
              </View>
              {selectedIds.size > 0 && (
                <Text style={[styles.actionBarCount, { color: colors.textMuted }]}>{selectedIds.size} selected</Text>
              )}
            </View>
          )}
        </View>
      </View>

      <BatchAddToCalendarModal
        visible={showBatchAddModal}
        selectedMeals={selectedMeals}
        onClose={() => setShowBatchAddModal(false)}
        onConfirm={handleBatchAddConfirm}
      />

      <MealDetailModal
        visible={!!detailMeal}
        meal={detailMeal}
        onClose={() => setDetailMeal(null)}
        onShareForVotes={(meal: SavedMeal) => {
          setDetailMeal(null)
          router.push(`/social/share-to-vote?shareIds=${encodeURIComponent(meal.id)}`)
        }}
        onAddToCalendar={(meal: SavedMeal) => {
          setDetailMeal(null)
          setAddToCalendarMeal(meal)
        }}
        onRemove={(meal: SavedMeal) => {
          removeSavedMeal(meal.id)
          setDetailMeal(null)
        }}
      />

      <AddToCalendarModal
        visible={!!addToCalendarMeal}
        mealTitle={addToCalendarMeal?.title ?? ''}
        onClose={() => setAddToCalendarMeal(null)}
        onConfirm={handleSingleAddToCalendarConfirm}
      />

      <MealDetailModal
        visible={showMealOfTheDayModal && !!mealOfTheDayAsSaved}
        meal={mealOfTheDayAsSaved}
        onClose={() => setShowMealOfTheDayModal(false)}
        onShareForVotes={(meal: SavedMeal) => {
          setShowMealOfTheDayModal(false)
          router.push(`/social/share-to-vote?shareIds=${encodeURIComponent(meal.id)}`)
        }}
        onAddToCalendar={(meal: SavedMeal) => {
          setShowMealOfTheDayModal(false)
          setAddToCalendarMeal(meal)
        }}
        onRemove={() => {}}
        variant="mealOfTheDay"
        onFavorite={handleMealOfTheDayFavorite}
      />

      {savedMeals.length > 0 && (
      <View style={styles.sideButtons}>
        {[
          { Icon: MealOfTheDayIcon, style: styles.sideButtonMealOfTheDay, onPress: handleMealOfTheDayPress, disabled: mealOfTheDayLoading, label: "Meal of\nthe day" },
          { Icon: Gamepad2, style: styles.sideButtonGames, onPress: () => { startSession('lunch'); router.replace('/game/round/0') }, disabled: false, label: "Mini\ngame", longPress: () => router.replace({ pathname: '/game/results', params: { base: '11111111-1111-1111-1111-111111111101', protein: '22222222-2222-2222-2222-222222222201', vegetable: '33333333-3333-3333-3333-333333333301', method: 'grilled' } }) },
          { Icon: Sparkles, style: styles.sideButtonFeelings, onPress: () => router.push('/game/feeling'), disabled: false, label: 'Feelings' },
          { Icon: ImageIcon, style: styles.sideButtonGallery, onPress: () => router.push('/food-gallery'), disabled: false, label: "Food\ngallery" }
        ].map((btn, i) => {
          const Icon = btn.Icon
          return (
            <Animated.View
              key={i}
              style={{
                transform: [
                  {
                    translateY: hopAnims[i].interpolate({
                      inputRange: [0, 0.35, 1],
                      outputRange: [0, -14, 0]
                    })
                  }
                ]
              }}>
              <TouchableOpacity
                style={[styles.sideButton, btn.style]}
                onPress={btn.onPress}
                disabled={btn.disabled}
                onLongPress={btn.longPress}
                delayLongPress={btn.longPress ? 600 : undefined}
                activeOpacity={0.8}>
                <Icon size={22} color="#ffffff" />
                <Text style={styles.sideButtonLabel}>{btn.label}</Text>
              </TouchableOpacity>
            </Animated.View>
          )
        })}
      </View>
      )}
      </View>
    </SwipeTabsContainer>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f8fafc'
  },
  main: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 24
  },
  banner: {
    backgroundColor: '#22c55e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20
  },
  bannerCarouselRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  bannerCarouselContent: {
    flex: 1
  },
  bannerCarouselWindow: {
    overflow: 'hidden'
  },
  bannerPanelAbsolute: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 0.5
  },
  bannerEvent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12
  },
  bannerEventPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: 14
  },
  bannerEventSlot: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginRight: 10
  },
  bannerEventTitleWrap: {
    flex: 1,
    minWidth: 0,
    marginRight: 8
  },
  /** Empty banner row (“Nothing planned”) */
  bannerEventLabel: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff'
  },
  bannerEventLabelText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff'
  },
  bannerEventDate: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginRight: 8
  },
  carouselWrap: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center'
  },
  carouselCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(255,255,255,0.5)'
  },
  carouselCardDay: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 2
  },
  carouselCardSlot: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 4
  },
  carouselCardLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff'
  },
  carouselDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8
  },
  carouselDotsRight: {
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 6,
    marginLeft: 12
  },
  carouselDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.35)'
  },
  carouselDotActive: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    width: 8,
    height: 8,
    borderRadius: 4
  },
  section: {
    flex: 1,
    minHeight: 120
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 10
  },
  groceryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 999,
    borderWidth: 1
  },
  groceryBtnText: {
    fontSize: 13,
    fontWeight: '800'
  },
  mealsList: {
    flex: 1,
    overflow: 'hidden'
  },
  mealsListContent: {
    paddingBottom: 24
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12
  },
  mealRowSelected: {
    borderColor: '#22c55e',
    backgroundColor: 'rgba(34, 197, 94, 0.08)'
  },
  mealRowPressed: {
    opacity: 0.85
  },
  mealRowThumb: {
    width: 24,
    height: 24,
    borderRadius: 6
  },
  mealRowCheck: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center'
  },
  mealRowCheckSelected: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e'
  },
  mealRowTextWrap: {
    flex: 1,
    minWidth: 0
  },
  mealRowLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b'
  },
  mealRowSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2
  },
  actionBarSelectAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12
  },
  actionBarSelectAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22c55e'
  },
  actionBar: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0'
  },
  actionBarCancel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12
  },
  actionBarCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b'
  },
  actionBarActions: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap'
  },
  actionBarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#f1f5f9'
  },
  actionBarBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b'
  },
  actionBarBtnTextDisabled: {
    color: '#94a3b8'
  },
  actionBarCount: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8
  },
  spinLink: {
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center'
  },
  spinLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366f1',
    textAlign: 'center'
  },
  decisionRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8
  },
  decisionBtnHalf: {
    flex: 1,
    minHeight: 34
  },
  fullGroceryBtn: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  fullGroceryBtnText: {
    fontSize: 12,
    fontWeight: '700'
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    paddingVertical: 24
  },
  emptyStateWrap: {
    paddingVertical: 20,
    paddingBottom: 28
  },
  emptyStateText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 8
  },
  emptyStateButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12
  },
  emptyStateBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 14,
    minWidth: 217,
    minHeight: 118
  },
  sideButtons: {
    width: 72,
    paddingTop: 51,
    paddingBottom: 24,
    paddingHorizontal: 10,
    justifyContent: 'flex-start',
    gap: 12
  },
  sideButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 14,
    minHeight: 88
  },
  sideButtonLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 14
  },
  sideButtonMealOfTheDay: {
    backgroundColor: '#6366f1'
  },
  sideButtonGames: {
    backgroundColor: '#f59e0b'
  },
  sideButtonFeelings: {
    backgroundColor: '#22c55e'
  },
  sideButtonGallery: {
    backgroundColor: '#8b5cf6'
  }
})
