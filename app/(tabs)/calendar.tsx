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
  Dimensions
} from 'react-native'
import { useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { useTabHeaderSlide } from '@/hooks/useTabHeaderSlide'
import { getLastFocusedTabIndex } from '@/lib/tab-transition'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Trash2, UtensilsCrossed, Gamepad2, Sparkles, Image } from 'lucide-react-native'
import { useThemeColors } from '@/hooks/useTheme'
import { useMealOfTheDay } from '@/hooks/useMealOfTheDay'
import { useGameSessionStore } from '@/store/game-session'
import { useCalendarStore } from '@/store/calendar-store'
import SwipeTabsContainer from '@/components/navigation/SwipeTabsContainer'
import MealDetailModal from '@/components/MealDetailModal'
import { dateKey } from '@/types/calendar'
import { scheduleMealReminder, cancelScheduledNotification } from '@/lib/notifications'
import DayDetailModal from '@/components/calendar/DayDetailModal'
import AddToCalendarModal from '@/components/calendar/AddToCalendarModal'
import MoveEventModal from '@/components/calendar/MoveEventModal'
import SetReminderModal from '@/components/calendar/SetReminderModal'
import PickSavedMealModal from '@/components/calendar/PickSavedMealModal'
import type { CalendarEvent, SavedMeal, MealSlot } from '@/types/calendar'
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

export default function CalendarScreen () {
  const colors = useThemeColors()
  const headerSlideStyle = useTabHeaderSlide(1) // Calendar tab index
  const [currentDate, setCurrentDate] = useState(new Date())
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
    removeSavedMeal
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
    }, [sectionSlide1, sectionSlide2, sectionSlide3])
  )

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

  const dayDetailEvents = selectedDate ? getEventsForDate(selectedDate) : []

  if (!hydrated) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <SwipeTabsContainer tabIndex={CALENDAR_TAB_INDEX}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Animated.View style={[styles.headerContent, headerSlideStyle]}>
            <CalendarIcon size={32} color={colors.primary} />
            <Text style={[styles.title, { color: colors.text }]}>Meal Calendar</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>Your upcoming meal schedule</Text>
          </Animated.View>
        </View>

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

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
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
        </Animated.View>

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
            Tap a meal to add it to the calendar
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
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.savedMealsList}>
              {savedMeals.map((meal) => (
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
              ))}
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
  }
})
