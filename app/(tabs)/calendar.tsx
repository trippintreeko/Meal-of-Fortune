import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Dimensions,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { useTabHeaderSlide } from '@/hooks/useTabHeaderSlide'
import { getLastFocusedTabIndex } from '@/lib/tab-transition'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Trash2, UtensilsCrossed, Gamepad2, Sparkles, Image, Coffee, Sun, Moon } from 'lucide-react-native'
import { useThemeColors } from '@/hooks/useTheme'
import { supabase } from '@/lib/supabase'
import { useMealOfTheDay } from '@/hooks/useMealOfTheDay'
import { useGameSessionStore } from '@/store/game-session'
import { useCalendarStore } from '@/store/calendar-store'
import SwipeTabsContainer from '@/components/navigation/SwipeTabsContainer'
import MealDetailModal from '@/components/MealDetailModal'
import { dateKey, addDaysToDateKey, formatShortDate, slotOrder, parseDateKey } from '@/types/calendar'
import { scheduleMealReminder, cancelScheduledNotification } from '@/lib/notifications'
import DayDetailModal from '@/components/calendar/DayDetailModal'
import AddToCalendarModal from '@/components/calendar/AddToCalendarModal'
import MoveEventModal from '@/components/calendar/MoveEventModal'
import SetReminderModal from '@/components/calendar/SetReminderModal'
import PickSavedMealModal from '@/components/calendar/PickSavedMealModal'
import WeekTimeGrid, { type WeekTimeGridHandle } from '@/components/calendar/WeekTimeGrid'
import WeekPlannerMealModal from '@/components/calendar/WeekPlannerMealModal'
import { SavedMealWeekDragChip } from '@/components/calendar/SavedMealWeekDragChip'
import type { CalendarEvent, SavedMeal, MealSlot } from '@/types/calendar'

const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner'
}
const SLOT_ICONS = { breakfast: Coffee, lunch: Sun, dinner: Moon }
import { getEmptyCalendarMessage } from '@/lib/empty-state-copy'

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const CONTENT_PADDING = 20
const GRID_PADDING = 8
const GRID_WIDTH = SCREEN_WIDTH - CONTENT_PADDING * 2 - GRID_PADDING * 2
const CELL_SIZE = GRID_WIDTH / 7
const CALENDAR_GRID_HEIGHT = CELL_SIZE * 6 // 6 rows max, rows share height
const ACTION_BTN_WIDTH = 103.8
const ACTION_BTN_HEIGHT = 54.4
const ACTION_BTN_GAP = 10

const DRAG_GHOST_W = 136
const DRAG_GHOST_OFFSET_Y = 36
type WeekRangeMode = 'monday_to_sunday' | 'yesterday_to_plus_five'

function mondayForDate (input: Date): Date {
  const d = new Date(input)
  const diff = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - diff)
  return d
}

function weekStartForMode (mode: WeekRangeMode): Date {
  const today = new Date()
  if (mode === 'yesterday_to_plus_five') {
    const start = new Date(today)
    start.setDate(start.getDate() - 1)
    return start
  }
  return mondayForDate(today)
}

function slotDragGhostColors (slot: MealSlot, primary: string): { bg: string; accent: string } {
  if (slot === 'breakfast') return { bg: 'rgba(254, 243, 199, 0.97)', accent: '#d97706' }
  if (slot === 'lunch') return { bg: 'rgba(207, 250, 254, 0.97)', accent: '#0891b2' }
  return { bg: 'rgba(237, 233, 254, 0.97)', accent: primary }
}

const FB_BASE = '11111111-1111-1111-1111-111111111101'
const FB_PROTEIN = '22222222-2222-2222-2222-222222222201'
const FB_VEG = '33333333-3333-3333-3333-333333333302'

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

function normalizeMealMethod (method: string | null | undefined): string {
  return (method ?? '').trim().toLowerCase()
}

function mealKeyFromParts (baseId: string | null | undefined, proteinId: string | null | undefined, vegetableId: string | null | undefined, method: string | null | undefined): string {
  return `${baseId ?? ''}|${proteinId ?? ''}|${vegetableId ?? ''}|${normalizeMealMethod(method)}`
}

function calendarEventToSavedMeal (
  ev: CalendarEvent,
  getSavedMeal: (id: string) => SavedMeal | undefined
): SavedMeal {
  if (ev.savedMealId) {
    const m = getSavedMeal(ev.savedMealId)
    if (m) return m
  }
  return {
    id: ev.savedMealId ?? ev.id,
    title: ev.title,
    baseId: ev.baseId ?? FB_BASE,
    proteinId: ev.proteinId ?? FB_PROTEIN,
    vegetableId: ev.vegetableId ?? FB_VEG,
    method: ev.method ?? 'grilled',
    createdAt: 0
  }
}

export default function CalendarScreen () {
  const colors = useThemeColors()
  const headerSlideStyle = useTabHeaderSlide(1) // Calendar tab index
  const [currentDate, setCurrentDate] = useState(new Date())
  const [calendarView, setCalendarView] = useState<'month' | 'week'>('week')
  const [weekRangeMode, setWeekRangeMode] = useState<WeekRangeMode>('monday_to_sunday')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [addModalVisible, setAddModalVisible] = useState(false)
  const [addModalMeal, setAddModalMeal] = useState<SavedMeal | null>(null)
  const [addModalDefaultDate, setAddModalDefaultDate] = useState<string | undefined>()
  const [moveEventId, setMoveEventId] = useState<string | null>(null)
  const [moveEventDate, setMoveEventDate] = useState<string | null>(null)
  const [copyEventId, setCopyEventId] = useState<string | null>(null)
  const [reminderEvent, setReminderEvent] = useState<CalendarEvent | null>(null)
  const [pickMealForDate, setPickMealForDate] = useState<string | null>(null)
  const [showMealOfTheDayModal, setShowMealOfTheDayModal] = useState(false)
  const [weekDragActive, setWeekDragActive] = useState(false)
  const [savedMealDragAt, setSavedMealDragAt] = useState<{ ax: number; ay: number } | null>(null)
  const [savedMealWeekDragging, setSavedMealWeekDragging] = useState(false)
  const [weekPlannerMeal, setWeekPlannerMeal] = useState<SavedMeal | null>(null)
  const [eventColorByCombo, setEventColorByCombo] = useState<Record<string, string>>({})
  const [eventColorByTitle, setEventColorByTitle] = useState<Record<string, string>>({})
  const weekGridRef = useRef<WeekTimeGridHandle | null>(null)
  const savedMealForDragRef = useRef<SavedMeal | null>(null)
  const lastSavedDragXY = useRef({ ax: 0, ay: 0 })
  const savedMealDragEndLock = useRef(false)
  const weekMainScrollRef = useRef<ScrollView>(null)
  const weekScrollYRef = useRef(0)
  const weekContentHeightRef = useRef(0)
  const weekViewportHeightRef = useRef(1)
  const scrollViewportWinRef = useRef({ top: 0, bottom: 800 })
  const lastDragAyRef = useRef(0)
  const [eventDragGhost, setEventDragGhost] = useState<{
    ax: number
    ay: number
    title: string
    slot: MealSlot
  } | null>(null)
  const calendarRootRef = useRef<View>(null)
  const [dragLayerOrigin, setDragLayerOrigin] = useState({ x: 0, y: 0 })

  const syncDragLayerOrigin = useCallback(() => {
    calendarRootRef.current?.measureInWindow((x, y) => {
      setDragLayerOrigin({ x, y })
    })
  }, [])

  const router = useRouter()
  const { meal: mealOfTheDay, loading: mealOfTheDayLoading } = useMealOfTheDay()
  const startSession = useGameSessionStore((s) => s.startSession)

  const {
    events,
    savedMeals,
    hydrated,
    load,
    getEventsForDate,
    addEvent,
    addSavedMeal,
    updateEvent,
    deleteEvent,
    moveEvent,
    copyEvent,
    removeSavedMeal,
    getSavedMeal
  } = useCalendarStore()

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
        method: meal.method
      })
      setShowMealOfTheDayModal(false)
    },
    [addSavedMeal]
  )

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { data, error } = await supabase
        .from('gallery_meals')
        .select('title, base_id, protein_id, vegetable_id, cooking_method, base_group')
      if (cancelled || error) return
      const rows = (data ?? []) as Array<{
        title: string | null
        base_id: string | null
        protein_id: string | null
        vegetable_id: string | null
        cooking_method: string | null
        base_group: string | null
      }>
      const comboMap: Record<string, string> = {}
      const titleMap: Record<string, string> = {}
      for (const row of rows) {
        const color = BASE_GROUP_COLORS[row.base_group ?? 'any'] ?? BASE_GROUP_COLORS.any
        const comboKey = mealKeyFromParts(row.base_id, row.protein_id, row.vegetable_id, row.cooking_method)
        if (comboKey !== '|||') comboMap[comboKey] = color
        const titleKey = (row.title ?? '').trim().toLowerCase()
        if (titleKey) titleMap[titleKey] = color
      }
      if (cancelled) return
      setEventColorByCombo(comboMap)
      setEventColorByTitle(titleMap)
    })()
    return () => { cancelled = true }
  }, [])

  const resolveEventColor = useCallback((ev: CalendarEvent): string | undefined => {
    const comboKey = mealKeyFromParts(ev.baseId, ev.proteinId, ev.vegetableId, ev.method)
    const byCombo = eventColorByCombo[comboKey]
    if (byCombo) return byCombo
    const titleKey = (ev.title ?? '').trim().toLowerCase()
    if (titleKey) return eventColorByTitle[titleKey]
    return undefined
  }, [eventColorByCombo, eventColorByTitle])

  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  ).getDate()

  const firstDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  ).getDay()

  const totalCells = firstDayOfMonth + daysInMonth
  const numRows = Math.ceil(totalCells / 7)

  const calendarRows = useMemo(() => {
    const rows: (number | null)[][] = []
    for (let r = 0; r < numRows; r++) {
      const row: (number | null)[] = []
      for (let c = 0; c < 7; c++) {
        const idx = r * 7 + c
        const isLeadingEmpty = idx < firstDayOfMonth
        const isTrailingEmpty = idx >= firstDayOfMonth + daysInMonth
        row.push(isLeadingEmpty || isTrailingEmpty ? null : idx - firstDayOfMonth + 1)
      }
      rows.push(row)
    }
    return rows
  }, [numRows, firstDayOfMonth, daysInMonth])

  const [weekStartKey, setWeekStartKey] = useState(() => dateKey(weekStartForMode('monday_to_sunday')))
  const weekDateKeys = useMemo(
    () => Array.from({ length: 8 }, (_, i) => addDaysToDateKey(weekStartKey, i)),
    [weekStartKey]
  )

  const CALENDAR_TAB_INDEX = 1
  const STAGGER_OFFSET = 80
  const STAGGER_DURATION = 320
  const STAGGER_EASING = Easing.bezier(0.42, 0, 0.58, 1)
  const sectionSlide1 = useRef(new Animated.Value(0)).current
  const sectionSlide2 = useRef(new Animated.Value(0)).current
  const sectionSlide3 = useRef(new Animated.Value(0)).current
  const [sectionFromX, setSectionFromX] = useState(80)
  const emptyCalendarCopy = useMemo(() => getEmptyCalendarMessage(), [])
  const emptyCalendarBtnAnims = useRef([0, 1, 2, 3].map(() => new Animated.Value(0))).current
  const calendarHopAnims = useRef([0, 1, 2, 3].map(() => new Animated.Value(0))).current

  const isCalendarSavedEmpty = savedMeals.length === 0
  useEffect(() => {
    if (!isCalendarSavedEmpty) {
      emptyCalendarBtnAnims.forEach((v) => v.setValue(0))
      return
    }
    const springConfig = { tension: 180, friction: 12 }
    emptyCalendarBtnAnims.forEach((v, i) => {
      Animated.spring(v, {
        toValue: 1,
        delay: i * 80,
        useNativeDriver: true,
        ...springConfig
      }).start()
    })
  }, [isCalendarSavedEmpty])

  useFocusEffect(
    useCallback(() => {
      setWeekStartKey(dateKey(weekStartForMode(weekRangeMode)))
      const prev = getLastFocusedTabIndex()
      const direction = CALENDAR_TAB_INDEX - prev
      const fromX = direction > 0 ? STAGGER_OFFSET : direction < 0 ? -STAGGER_OFFSET : 0
      setSectionFromX(fromX)
      sectionSlide1.setValue(0)
      sectionSlide2.setValue(0)
      sectionSlide3.setValue(0)
      calendarHopAnims.forEach((v) => v.setValue(0))
      Animated.stagger(80, [
        Animated.timing(sectionSlide1, {
          toValue: 1,
          duration: STAGGER_DURATION,
          useNativeDriver: true,
          easing: STAGGER_EASING
        }),
        Animated.timing(sectionSlide2, {
          toValue: 1,
          duration: STAGGER_DURATION,
          useNativeDriver: true,
          easing: STAGGER_EASING
        }),
        Animated.timing(sectionSlide3, {
          toValue: 1,
          duration: STAGGER_DURATION,
          useNativeDriver: true,
          easing: STAGGER_EASING
        })
      ]).start()
      const hopConfig = { tension: 200, friction: 10 }
      const t = setTimeout(() => {
        calendarHopAnims.forEach((v, i) => {
          Animated.spring(v, {
            toValue: 1,
            delay: i * 70,
            useNativeDriver: true,
            ...hopConfig
          }).start()
        })
      }, 420)
      return () => {
        clearTimeout(t)
        sectionSlide1.setValue(0)
        sectionSlide2.setValue(0)
        sectionSlide3.setValue(0)
      }
    }, [sectionSlide1, sectionSlide2, sectionSlide3, weekRangeMode])
  )

  useEffect(() => {
    setWeekStartKey(dateKey(weekStartForMode(weekRangeMode)))
  }, [weekRangeMode])

  const weekStartDate = useMemo(() => parseDateKey(weekStartKey), [weekStartKey])
  const weekEvents = useMemo(() => {
    const keys = new Set(weekDateKeys.slice(0, 7))
    return events.filter(e => keys.has(e.date))
  }, [events, weekDateKeys])

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  const hasEventsOnDay = (year: number, month: number, day: number) => {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return events.some(e => e.date === key)
  }

  const handleDayPress = (year: number, month: number, day: number) => {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    setSelectedDate(key)
  }

  const handleAddMealFromDay = (date: string) => {
    setPickMealForDate(date)
  }

  const handlePickMealSelect = (meal: SavedMeal) => {
    const date = pickMealForDate
    setPickMealForDate(null)
    setAddModalMeal(meal)
    setAddModalDefaultDate(date ?? undefined)
    setAddModalVisible(true)
  }

  const handleAddFromSavedMeal = (meal: SavedMeal) => {
    setAddModalMeal(meal)
    setAddModalDefaultDate(undefined)
    setAddModalVisible(true)
  }

  const handleSavedMealWeekDragStart = useCallback((meal: SavedMeal) => {
    savedMealForDragRef.current = meal
    setSavedMealWeekDragging(true)
    setWeekDragActive(true)
    syncDragLayerOrigin()
    requestAnimationFrame(() => {
      ;(weekMainScrollRef.current as unknown as View | null)?.measureInWindow(
        (x: number, y: number, w: number, h: number) => {
          scrollViewportWinRef.current = { top: y, bottom: y + h }
        }
      )
    })
  }, [syncDragLayerOrigin])

  const applyWeekDragEdgeScroll = useCallback((ay: number) => {
    const scroll = weekMainScrollRef.current
    if (!scroll) return
    let { top, bottom } = scrollViewportWinRef.current
    const winH = Dimensions.get('window').height
    if (bottom - top < 100) {
      top = Math.min(top, 160) || 140
      bottom = Math.max(bottom, winH - 88) || winH - 90
    }
    const zone = 105
    const maxStep = 36
    const maxScrollY = Math.max(
      0,
      weekContentHeightRef.current - weekViewportHeightRef.current
    )
    if (ay < top + zone) {
      const depth = Math.max(0, (top + zone - ay) / zone)
      const intensity = Math.max(0.2, Math.min(1, depth))
      const step = maxStep * intensity
      const next = Math.max(0, weekScrollYRef.current - step)
      weekScrollYRef.current = next
      scroll.scrollTo({ y: next, animated: false })
    } else if (ay > bottom - zone) {
      const depth = Math.max(0, (ay - (bottom - zone)) / zone)
      const intensity = Math.max(0.2, Math.min(1, depth))
      const step = maxStep * intensity
      const next =
        maxScrollY > 0
          ? Math.min(maxScrollY, weekScrollYRef.current + step)
          : weekScrollYRef.current + step
      weekScrollYRef.current = next
      scroll.scrollTo({ y: next, animated: false })
    }
  }, [])

  useEffect(() => {
    if (!weekDragActive || calendarView !== 'week') return
    const id = setInterval(() => {
      applyWeekDragEdgeScroll(lastDragAyRef.current)
    }, 40)
    return () => clearInterval(id)
  }, [weekDragActive, calendarView, applyWeekDragEdgeScroll])

  const handleSavedMealWeekDragMove = useCallback((ax: number, ay: number) => {
    lastDragAyRef.current = ay
    lastSavedDragXY.current = { ax, ay }
    setSavedMealDragAt({ ax, ay })
  }, [])

  const handleEventDragFinger = useCallback(
    (p: { ax: number; ay: number; title: string; slot: MealSlot } | null) => {
      if (p) {
        lastDragAyRef.current = p.ay
        setEventDragGhost(p)
      } else setEventDragGhost(null)
    },
    []
  )

  const handleSavedMealWeekDragEnd = useCallback(async () => {
    const meal = savedMealForDragRef.current
    if (!meal) {
      setSavedMealWeekDragging(false)
      setSavedMealDragAt(null)
      setWeekDragActive(false)
      return
    }
    if (savedMealDragEndLock.current) return
    savedMealDragEndLock.current = true
    const { ax, ay } = lastSavedDragXY.current
    await new Promise((r) => setTimeout(r, 100))
    const target = weekGridRef.current?.resolveSavedMealDrop(ax, ay)
    if (target) {
      await addEvent({
        date: target.dateKey,
        mealSlot: target.slot,
        savedMealId: meal.id,
        title: meal.title,
        baseId: meal.baseId,
        proteinId: meal.proteinId,
        vegetableId: meal.vegetableId,
        method: meal.method
      })
    }
    savedMealForDragRef.current = null
    setSavedMealWeekDragging(false)
    setSavedMealDragAt(null)
    setWeekDragActive(false)
    savedMealDragEndLock.current = false
  }, [addEvent])

  const handleRemoveSavedMeal = (meal: SavedMeal) => {
    Alert.alert(
      'Remove from saved',
      `Remove "${meal.title}" from your saved meals?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeSavedMeal(meal.id) }
      ]
    )
  }

  const handleAddToCalendarConfirm = async (date: string, slot: MealSlot) => {
    if (addModalMeal) {
      await addEvent({
        date,
        mealSlot: slot,
        savedMealId: addModalMeal.id,
        title: addModalMeal.title,
        baseId: addModalMeal.baseId,
        proteinId: addModalMeal.proteinId,
        vegetableId: addModalMeal.vegetableId,
        method: addModalMeal.method
      })
    }
    setAddModalVisible(false)
    setAddModalMeal(null)
    setAddModalDefaultDate(undefined)
  }

  const handleMove = (eventId: string) => {
    const ev = events.find(e => e.id === eventId)
    if (ev) {
      setMoveEventId(eventId)
      setMoveEventDate(ev.date)
    }
  }

  const handleMoveConfirm = async (date: string, slot: MealSlot) => {
    if (moveEventId) {
      await moveEvent(moveEventId, date, slot)
      setMoveEventId(null)
      setMoveEventDate(null)
    }
  }

  const handleCopy = (eventId: string) => {
    setCopyEventId(eventId)
  }

  const handleCopyConfirm = async (date: string, slot: MealSlot) => {
    if (!copyEventId) return
    await copyEvent(copyEventId, date, slot)
    setCopyEventId(null)
  }

  const handleSetReminder = (eventId: string) => {
    const ev = events.find(e => e.id === eventId)
    if (ev) setReminderEvent(ev)
  }

  const handleReminderConfirm = async (triggerAt: Date) => {
    if (!reminderEvent) return null
    const notifId = await scheduleMealReminder(reminderEvent.id, reminderEvent.title, triggerAt)
    if (notifId) {
      await updateEvent(reminderEvent.id, { reminderAt: triggerAt.toISOString(), notificationId: notifId })
    }
    setReminderEvent(null)
    return notifId
  }

  const handleDelete = async (eventId: string) => {
    const ev = events.find(e => e.id === eventId)
    if (ev?.notificationId) {
      await cancelScheduledNotification(ev.notificationId)
    }
    await deleteEvent(eventId)
    setSelectedDate(null)
  }

  const handlePlannerWeekDelete = useCallback(
    async (eventId: string) => {
      const ev = events.find(e => e.id === eventId)
      if (ev?.notificationId) await cancelScheduledNotification(ev.notificationId)
      await deleteEvent(eventId)
    },
    [events, deleteEvent]
  )

  const dayDetailEvents = selectedDate ? getEventsForDate(selectedDate) : []

  const eventGhostPalette =
    !savedMealWeekDragging && eventDragGhost
      ? slotDragGhostColors(eventDragGhost.slot, colors.primary)
      : null

  if (!hydrated) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <SwipeTabsContainer tabIndex={CALENDAR_TAB_INDEX}>
      <View
        ref={calendarRootRef}
        style={[styles.container, { backgroundColor: colors.background }]}
        onLayout={() => {
          syncDragLayerOrigin()
        }}
      >
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Animated.View style={[styles.headerContent, headerSlideStyle]}>
            <CalendarIcon size={32} color={colors.primary} />
            <Text style={[styles.title, { color: colors.text }]}>Meal Calendar</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>Your upcoming meal schedule</Text>
          </Animated.View>
        </View>
        <View style={[styles.viewToggleRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.viewToggleBtn,
              calendarView === 'month' && styles.viewToggleBtnActive
            ]}
            onPress={() => setCalendarView('month')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.viewToggleText,
                calendarView === 'month' && [styles.viewToggleTextActive, { color: colors.primary }]
              ]}
            >
              Month
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewToggleBtn,
              calendarView === 'week' && styles.viewToggleBtnActive
            ]}
            onPress={() => setCalendarView('week')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.viewToggleText,
                calendarView === 'week' && [styles.viewToggleTextActive, { color: colors.primary }]
              ]}
            >
              Week
            </Text>
          </TouchableOpacity>
        </View>

        {calendarView === 'month' && (
          <>
            <View style={[styles.calendarControls, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={previousMonth} style={styles.navButton}>
                <ChevronLeft size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.monthYear, { color: colors.text }]}>
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </Text>
              <TouchableOpacity onPress={nextMonth} style={styles.navButton}>
                <ChevronRight size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={[styles.weekDays, { backgroundColor: colors.card }]}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <View key={day} style={styles.weekDayCell}>
                  <Text style={[styles.weekDayText, { color: colors.textMuted }]}>{day}</Text>
                </View>
              ))}
            </View>
          </>
        )}

      <ScrollView
        ref={weekMainScrollRef}
        scrollEnabled={!weekDragActive || calendarView === 'week'}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(e) => {
          weekScrollYRef.current = e.nativeEvent.contentOffset.y
        }}
        onContentSizeChange={(_, h) => {
          weekContentHeightRef.current = h
        }}
        onLayout={(e) => {
          weekViewportHeightRef.current = e.nativeEvent.layout.height
          requestAnimationFrame(() => {
            ;(weekMainScrollRef.current as unknown as View | null)?.measureInWindow(
              (x: number, y: number, w: number, h: number) => {
                scrollViewportWinRef.current = { top: y, bottom: y + h }
              }
            )
          })
        }}
      >
        <Animated.View
          style={{
            opacity: sectionSlide1,
            transform: [
              {
                  translateX: sectionSlide1.interpolate({
                    inputRange: [0, 1],
                    outputRange: [sectionFromX, 0]
                  })
              }
            ]
          }}
        >
          {calendarView === 'month' && (
            <View style={[styles.calendarGrid, { backgroundColor: colors.card, height: CALENDAR_GRID_HEIGHT }]}>
              {calendarRows.map((rowCells, rowIndex) => (
                <View key={rowIndex} style={styles.calendarGridRow}>
                  {rowCells.map((dayOrNull, colIndex) => {
                    if (dayOrNull === null) {
                      return (
                        <View key={`e-${rowIndex}-${colIndex}`} style={styles.dayCellFill} />
                      )
                    }
                    const day = dayOrNull
                    const isToday =
                      day === new Date().getDate() &&
                      currentDate.getMonth() === new Date().getMonth() &&
                      currentDate.getFullYear() === new Date().getFullYear()
                    const hasEvents = hasEventsOnDay(currentDate.getFullYear(), currentDate.getMonth(), day)
                    return (
                      <View key={day} style={styles.dayCellFill}>
                        <TouchableOpacity
                          style={[
                            styles.dayCellInner,
                            isToday && styles.todayCell,
                            hasEvents && styles.dayWithEvents
                          ]}
                          onPress={() => handleDayPress(currentDate.getFullYear(), currentDate.getMonth(), day)}
                        >
                          <Text style={[styles.dayText, { color: colors.text }, isToday && styles.todayText]}>{day}</Text>
                          {hasEvents && <View style={styles.dot} />}
                        </TouchableOpacity>
                      </View>
                    )
                  })}
                </View>
              ))}
            </View>
          )}
        </Animated.View>

        {calendarView === 'week' && (
          <View style={styles.weekGridSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Week planner</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
              Long-press a meal to rearrange the week (all meals wiggle). Tap empty space to finish. Tap a meal for
              details; tap the day column to manage.
            </Text>
            <View style={[styles.weekRangeToggleWrap, { backgroundColor: colors.card, borderColor: colors.border + '66' }]}>
              <TouchableOpacity
                style={[
                  styles.weekRangeToggleBtn,
                  weekRangeMode === 'monday_to_sunday' && [
                    styles.weekRangeToggleBtnActive,
                    { backgroundColor: colors.primary + '1f' }
                  ]
                ]}
                onPress={() => setWeekRangeMode('monday_to_sunday')}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.weekRangeToggleText,
                    { color: colors.textMuted },
                    weekRangeMode === 'monday_to_sunday' && { color: colors.primary }
                  ]}
                >
                  Mon to Sun
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.weekRangeToggleBtn,
                  weekRangeMode === 'yesterday_to_plus_five' && [
                    styles.weekRangeToggleBtnActive,
                    { backgroundColor: colors.primary + '1f' }
                  ]
                ]}
                onPress={() => setWeekRangeMode('yesterday_to_plus_five')}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.weekRangeToggleText,
                    { color: colors.textMuted },
                    weekRangeMode === 'yesterday_to_plus_five' && { color: colors.primary }
                  ]}
                >
                  Yesterday + 6 days
                </Text>
              </TouchableOpacity>
            </View>
            <WeekTimeGrid
              ref={weekGridRef}
              weekStart={weekStartDate}
              events={weekEvents}
              resolveMealColor={resolveEventColor}
              savedMealDragging={savedMealWeekDragging}
              savedMealDragAt={savedMealDragAt}
              onDeletePlannerEvent={handlePlannerWeekDelete}
              onDragActiveChange={setWeekDragActive}
              onDragScreenMove={(_ax, ay) => {
                lastDragAyRef.current = ay
              }}
              onDragFinger={handleEventDragFinger}
              onEventDragBegan={() => {
                syncDragLayerOrigin()
                requestAnimationFrame(() => {
                  ;(weekMainScrollRef.current as unknown as View | null)?.measureInWindow(
                    (x: number, y: number, w: number, h: number) => {
                      scrollViewportWinRef.current = { top: y, bottom: y + h }
                    }
                  )
                })
              }}
              onOpenDay={(dk) => setSelectedDate(dk)}
              onOpenMeal={(ev) => setWeekPlannerMeal(calendarEventToSavedMeal(ev, getSavedMeal))}
              onMoveEventDay={async (eventId, toDateKey, toSlot) => {
                const ev = events.find(e => e.id === eventId)
                if (!ev) return
                await moveEvent(eventId, toDateKey, toSlot)
              }}
              onCopyEventToDay={async (eventId, toDateKey) => {
                const ev = events.find(e => e.id === eventId)
                if (!ev) return
                await copyEvent(eventId, toDateKey, ev.mealSlot)
              }}
            />
          </View>
        )}

        <Animated.View
          style={[
            styles.mealsSection,
            {
              opacity: sectionSlide2,
              transform: [
                {
                  translateX: sectionSlide2.interpolate({
                    inputRange: [0, 1],
                    outputRange: [sectionFromX, 0]
                  })
                }
              ]
            }
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Saved meals</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
            {calendarView === 'week'
              ? 'Long-press a meal, drag to a day: left = breakfast, middle = lunch, right = dinner. Or tap to pick a date.'
              : 'Tap a meal to add it to the calendar'}
          </Text>
          {savedMeals.length === 0 ? (
            <View style={styles.emptyStateWrap}>
              <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>{emptyCalendarCopy}</Text>
              <View style={styles.emptyStateButtons}>
                {[
                  { label: 'Meal of day', Icon: UtensilsCrossed, color: '#6366f1', onPress: handleMealOfTheDayPress, disabled: mealOfTheDayLoading },
                  { label: 'Minigame', Icon: Gamepad2, color: '#f59e0b', onPress: () => { startSession('lunch'); router.replace('/game/round/0') } },
                  { label: 'Feelings', Icon: Sparkles, color: '#22c55e', onPress: () => router.push('/game/feeling') },
                  { label: 'Gallery', Icon: Image, color: '#8b5cf6', onPress: () => router.push('/food-gallery') }
                ].map((btn, i) => {
                  const Icon = btn.Icon
                  return (
                    <Animated.View
                      key={i}
                      style={{
                        width: ACTION_BTN_WIDTH,
                        height: ACTION_BTN_HEIGHT,
                        opacity: emptyCalendarBtnAnims[i],
                        transform: [
                          {
                            translateY: emptyCalendarBtnAnims[i].interpolate({
                              inputRange: [0, 1],
                              outputRange: [40, 0]
                            })
                          },
                          {
                            scale: emptyCalendarBtnAnims[i].interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.85, 1]
                            })
                          },
                          {
                            translateY: calendarHopAnims[i].interpolate({
                              inputRange: [0, 0.35, 1],
                              outputRange: [0, -14, 0]
                            })
                          }
                        ]
                      }}>
                      <TouchableOpacity
                        style={[styles.quickActionBtn, { backgroundColor: btn.color }]}
                        onPress={btn.onPress}
                        disabled={btn.disabled}
                        activeOpacity={0.8}>
                        <Icon size={22} color="#ffffff" />
                        <Text style={styles.quickActionLabel}>{btn.label}</Text>
                      </TouchableOpacity>
                    </Animated.View>
                  )
                })}
              </View>
            </View>
          ) : (
            <ScrollView
              horizontal
              scrollEnabled={calendarView !== 'week' || !weekDragActive}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.savedMealsList}>
              {savedMeals.map((meal) =>
                calendarView === 'week' ? (
                  <SavedMealWeekDragChip
                    key={meal.id}
                    meal={meal}
                    colors={{
                      card: colors.card,
                      cardBorder: colors.cardBorder,
                      primary: colors.primary,
                      text: colors.text
                    }}
                    onTap={() => handleAddFromSavedMeal(meal)}
                    onDragStart={handleSavedMealWeekDragStart}
                    onDragMove={handleSavedMealWeekDragMove}
                    onDragEnd={handleSavedMealWeekDragEnd}
                  />
                ) : (
                  <TouchableOpacity
                    key={meal.id}
                    style={[styles.savedMealChip, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                    onPress={() => handleAddFromSavedMeal(meal)}
                    activeOpacity={0.7}>
                    <View style={styles.savedMealChipContent}>
                      <Plus size={18} color={colors.primary} />
                      <Text style={[styles.savedMealChipText, { color: colors.text }]} numberOfLines={2}>
                        {meal.title || 'Untitled meal'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )
              )}
            </ScrollView>
          )}
        </Animated.View>

        {savedMeals.length > 0 && (
        <Animated.View
          style={[
            styles.quickActionsRow,
            {
              opacity: sectionSlide3,
              transform: [
                {
                  translateX: sectionSlide3.interpolate({
                    inputRange: [0, 1],
                    outputRange: [sectionFromX, 0]
                  })
                }
              ]
            }
          ]}
        >
          {[
            { Icon: UtensilsCrossed, color: '#6366f1', onPress: handleMealOfTheDayPress, disabled: mealOfTheDayLoading, label: 'Meal of day' },
            { Icon: Gamepad2, color: '#f59e0b', onPress: () => { startSession('lunch'); router.replace('/game/round/0') }, disabled: false, label: 'Minigame' },
            { Icon: Sparkles, color: '#22c55e', onPress: () => router.push('/game/feeling'), disabled: false, label: 'Feelings' },
            { Icon: Image, color: '#8b5cf6', onPress: () => router.push('/food-gallery'), disabled: false, label: 'Gallery' }
          ].map((btn, i) => {
            const Icon = btn.Icon
            return (
              <Animated.View
                key={i}
                style={{ width: ACTION_BTN_WIDTH, height: ACTION_BTN_HEIGHT, transform: [{ translateY: calendarHopAnims[i].interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, -14, 0] }) }] }}>
                <TouchableOpacity
                  style={[styles.quickActionBtn, { backgroundColor: btn.color }]}
                  onPress={btn.onPress}
                  disabled={btn.disabled}
                  activeOpacity={0.8}>
                  <Icon size={22} color="#ffffff" />
                  <Text style={styles.quickActionLabel}>{btn.label}</Text>
                </TouchableOpacity>
              </Animated.View>
            )
          })}
        </Animated.View>
        )}
      </ScrollView>

      {calendarView === 'week' &&
        weekDragActive &&
        ((savedMealWeekDragging && savedMealDragAt) || eventDragGhost) && (
          <View style={styles.dragGhostLayer} pointerEvents="none">
            {savedMealWeekDragging && savedMealDragAt && savedMealForDragRef.current && (
              <View
                style={[
                  styles.dragGhost,
                  {
                    left:
                      savedMealDragAt.ax - dragLayerOrigin.x - DRAG_GHOST_W / 2,
                    top:
                      savedMealDragAt.ay - dragLayerOrigin.y - DRAG_GHOST_OFFSET_Y,
                    width: DRAG_GHOST_W,
                    backgroundColor: colors.card,
                    borderColor: colors.primary + '99'
                  },
                  styles.dragGhostShadow
                ]}
              >
                <Plus size={18} color={colors.primary} />
                <Text
                  style={[styles.dragGhostTitle, { color: colors.text }]}
                  numberOfLines={2}
                >
                  {savedMealForDragRef.current.title || 'Meal'}
                </Text>
              </View>
            )}
            {!savedMealWeekDragging && eventDragGhost && eventGhostPalette && (
              <View
                style={[
                  styles.dragGhost,
                  styles.dragGhostEventCol,
                  {
                    left:
                      eventDragGhost.ax - dragLayerOrigin.x - DRAG_GHOST_W / 2,
                    top:
                      eventDragGhost.ay - dragLayerOrigin.y - DRAG_GHOST_OFFSET_Y,
                    width: DRAG_GHOST_W,
                    backgroundColor: eventGhostPalette.bg,
                    borderColor: eventGhostPalette.accent + '88'
                  },
                  styles.dragGhostShadow
                ]}
              >
                <Text
                  style={[styles.dragGhostSlot, { color: eventGhostPalette.accent }]}
                >
                  {eventDragGhost.slot === 'breakfast'
                    ? 'Breakfast'
                    : eventDragGhost.slot === 'lunch'
                      ? 'Lunch'
                      : 'Dinner'}
                </Text>
                <Text
                  style={[styles.dragGhostTitle, { color: colors.text }]}
                  numberOfLines={2}
                >
                  {eventDragGhost.title || 'Meal'}
                </Text>
              </View>
            )}
          </View>
        )}

      <WeekPlannerMealModal
        visible={weekPlannerMeal != null}
        meal={weekPlannerMeal}
        onClose={() => setWeekPlannerMeal(null)}
      />

      <DayDetailModal
        visible={selectedDate != null}
        date={selectedDate ?? ''}
        events={dayDetailEvents}
        onClose={() => setSelectedDate(null)}
        onMove={handleMove}
        onDelete={handleDelete}
        onCopy={handleCopy}
        onSetReminder={handleSetReminder}
        onAddMeal={() => selectedDate && handleAddMealFromDay(selectedDate)}
      />

      <PickSavedMealModal
        visible={pickMealForDate != null}
        savedMeals={savedMeals}
        onClose={() => setPickMealForDate(null)}
        onSelect={handlePickMealSelect}
      />

      <AddToCalendarModal
        visible={addModalVisible && addModalMeal != null}
        mealTitle={addModalMeal?.title ?? ''}
        defaultDate={addModalDefaultDate}
        onClose={() => {
          setAddModalVisible(false)
          setAddModalMeal(null)
          setAddModalDefaultDate(undefined)
        }}
        onConfirm={handleAddToCalendarConfirm}
      />

      <MoveEventModal
        visible={moveEventId != null}
        currentDate={moveEventDate ?? dateKey(new Date())}
        onClose={() => {
          setMoveEventId(null)
          setMoveEventDate(null)
        }}
        onConfirm={handleMoveConfirm}
      />

      {copyEventId != null && (
        <AddToCalendarModal
          visible
          mealTitle="Copy to"
          confirmLabel="Copy here"
          onClose={() => setCopyEventId(null)}
          onConfirm={handleCopyConfirm}
        />
      )}

      {reminderEvent != null && (
        <SetReminderModal
          visible
          eventTitle={reminderEvent.title}
          eventDate={reminderEvent.date}
          mealSlot={reminderEvent.mealSlot}
          onClose={() => setReminderEvent(null)}
          onConfirm={handleReminderConfirm}
        />
      )}

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
          setAddModalMeal(meal)
          setAddModalDefaultDate(undefined)
          setAddModalVisible(true)
        }}
        onRemove={() => {}}
        variant="mealOfTheDay"
        onFavorite={handleMealOfTheDayFavorite}
      />
      </View>
    </SwipeTabsContainer>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    overflow: 'hidden'
  },
  headerContent: {
    alignItems: 'center'
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 6
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2
  },
  viewToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  viewToggleBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10
  },
  viewToggleBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#22c55e'
  },
  viewToggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b'
  },
  viewToggleTextActive: {
    fontWeight: '700',
    color: '#22c55e'
  },
  calendarControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  navButton: {
    padding: 8
  },
  monthYear: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b'
  },
  weekDays: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center'
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b'
  },
  content: {
    padding: 20,
    paddingBottom: 100
  },
  calendarGrid: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 8,
    marginBottom: 24
  },
  calendarGridRow: {
    flex: 1,
    flexDirection: 'row'
  },
  dayCellFill: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
    position: 'relative'
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
    position: 'relative'
  },
  dayCellInner: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4
  },
  dayCellContent: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100%'
  },
  todayCell: {
    backgroundColor: '#22c55e',
    borderRadius: 8
  },
  dayWithEvents: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderRadius: 8
  },
  dayText: {
    fontSize: 14,
    color: '#1e293b'
  },
  todayText: {
    color: '#ffffff',
    fontWeight: '700'
  },
  dot: {
    position: 'absolute',
    bottom: 4,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#22c55e'
  },
  weekViewSection: {
    marginBottom: 24
  },
  weekGridSection: {
    marginBottom: 24
  },
  weekRangeToggleWrap: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 4,
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10
  },
  weekRangeToggleBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  weekRangeToggleBtnActive: {
    borderWidth: 1,
    borderColor: 'transparent'
  },
  weekRangeToggleText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center'
  },
  weekDayCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden'
  },
  weekDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14
  },
  weekDayLabel: {
    fontSize: 16,
    fontWeight: '600'
  },
  weekDayLabelToday: {
    fontWeight: '700'
  },
  weekDayDate: {
    fontSize: 13
  },
  weekDayEmpty: {
    fontSize: 14,
    paddingVertical: 12,
    paddingHorizontal: 14
  },
  weekDayMeals: {
    paddingHorizontal: 14,
    paddingBottom: 12
  },
  weekDayMealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderTopWidth: 1
  },
  weekDaySlot: {
    fontSize: 12,
    fontWeight: '600',
    width: 72
  },
  weekDayMealTitle: {
    fontSize: 14,
    flex: 1,
    minWidth: 0
  },
  mealsSection: {
    marginTop: 8
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12
  },
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 15,
    marginTop: 12,
    lineHeight: 22
  },
  emptyStateWrap: {
    paddingVertical: 16,
    paddingBottom: 24
  },
  emptyStateText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 4
  },
  emptyStateButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ACTION_BTN_GAP
  },
  savedMealsList: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4
  },
  savedMealChip: {
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minWidth: 160,
    maxWidth: 200
  },
  savedMealChipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14
  },
  savedMealChipMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flex: 1
  },
  savedMealChipRemove: {
    padding: 4
  },
  savedMealChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    minWidth: 0
  },
  quickActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ACTION_BTN_GAP,
    marginTop: 16,
    marginBottom: 24
  },
  quickActionBtn: {
    width: ACTION_BTN_WIDTH,
    height: ACTION_BTN_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 12,
    gap: 2
  },
  quickActionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center'
  },
  dragGhostLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 500,
    elevation: 0
  },
  dragGhost: {
    position: 'absolute',
    borderRadius: 14,
    borderWidth: 2,
    paddingHorizontal: 10,
    paddingVertical: 9,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  dragGhostEventCol: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4
  },
  dragGhostSlot: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase'
  },
  dragGhostTitle: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
    flex: 1,
    minWidth: 0
  },
  dragGhostShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 16
  }
})
