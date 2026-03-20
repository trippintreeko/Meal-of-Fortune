'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
  type ReactNode
} from 'react'
import { View, Text, StyleSheet, Platform, Pressable } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing
} from 'react-native-reanimated'
import { X } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useTheme, useThemeColors } from '@/hooks/useTheme'
import type { CalendarEvent, MealSlot } from '@/types/calendar'
import { dateKey, parseDateKey } from '@/types/calendar'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner']

const COMPACT_CELL_H = 36
const COMPACT_ROW_PAD = 6
const MEAL_CELL_MIN_H = 122
const STACK_GAP = 6
/** Overlap between top / middle / bottom bands when multiple slots are filled */
const ZONE_MERGE = 44
/** Per stacked card incl. gap — keep in sync with `stackedBlob` */
const BLOB_STACK_UNIT = 66

export type WeekTimeGridHandle = {
  resolveSavedMealDrop: (absoluteX: number, absoluteY: number) => {
    dateKey: string
    slot: MealSlot
  } | null
}

type Props = {
  weekStart: Date
  events: CalendarEvent[]
  resolveMealColor?: (event: CalendarEvent) => string | undefined
  onOpenDay: (dateKey: string) => void
  /** Tap meal blob → preview (photo, recipe, grocery). If omitted, tap opens day. */
  onOpenMeal?: (event: CalendarEvent) => void
  onMoveEventDay: (
    eventId: string,
    toDateKey: string,
    toSlot: MealSlot
  ) => Promise<void>
  onCopyEventToDay: (eventId: string, toDateKey: string) => Promise<void>
  onDragActiveChange?: (active: boolean) => void
  savedMealDragging?: boolean
  savedMealDragAt?: { ax: number; ay: number } | null
  /** Parent can auto-scroll when finger nears screen top/bottom during event drag */
  onDragScreenMove?: (absoluteX: number, absoluteY: number) => void
  /** Floating drag preview (finger position + meal info) */
  onDragFinger?: (
    p: { ax: number; ay: number; title: string; slot: MealSlot } | null
  ) => void
  /** Remeasure scroll viewport (screen coords) when user starts dragging a planner meal */
  onEventDragBegan?: () => void
  onDeletePlannerEvent: (eventId: string) => void | Promise<void>
}

function toRgb (hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.trim().replace('#', '')
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(clean)) return null
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean
  const n = Number.parseInt(full, 16)
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255
  }
}

function toHex (r: number, g: number, b: number): string {
  const to = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

function mixRgb (
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  amount: number
): { r: number; g: number; b: number } {
  const t = Math.max(0, Math.min(1, amount))
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t
  }
}

function toRgba (rgb: { r: number; g: number; b: number }, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha))
  return `rgba(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}, ${a})`
}

function slotTheme (slot: MealSlot, primary: string, mealColor?: string): { bg: string; accent: string } {
  const mealRgb = mealColor ? toRgb(mealColor) : null
  if (mealRgb) {
    const pastelRgb = mixRgb(mealRgb, { r: 255, g: 255, b: 255 }, 0.72)
    const accentRgb = mixRgb(mealRgb, { r: 0, g: 0, b: 0 }, 0.15)
    return { bg: toRgba(pastelRgb, 0.96), accent: toHex(accentRgb.r, accentRgb.g, accentRgb.b) }
  }
  if (slot === 'breakfast') return { bg: 'rgba(254, 243, 199, 0.92)', accent: '#d97706' }
  if (slot === 'lunch') return { bg: 'rgba(207, 250, 254, 0.92)', accent: '#0891b2' }
  return { bg: 'rgba(237, 233, 254, 0.92)', accent: primary }
}

function slotLabel (slot: MealSlot): string {
  if (slot === 'breakfast') return 'Breakfast'
  if (slot === 'lunch') return 'Lunch'
  return 'Dinner'
}

function dayLabelFromDateKey (dk: string): string {
  const day = parseDateKey(dk).getDay()
  return DAY_LABELS[day] ?? 'Day'
}

function slotFromXInCell (ax: number, cell: { x: number; y: number; w: number; h: number }): MealSlot {
  const t = (ax - cell.x) / Math.max(cell.w, 1)
  const u = Math.max(0, Math.min(1, t))
  if (u < 1 / 3) return 'breakfast'
  if (u < 2 / 3) return 'lunch'
  return 'dinner'
}

/** Extra min-height while a planner meal is dragged over this day (transform mode) */
const HOVER_DAY_EXPAND_PX = 40

function AnimatedPlannerBlobCell ({
  baseMinH,
  isHoverTarget,
  hoverGrowActive,
  style,
  innerRef,
  onLayoutCb,
  children
}: {
  baseMinH: number
  isHoverTarget: boolean
  hoverGrowActive: boolean
  style: object
  innerRef: (r: View | null) => void
  onLayoutCb: () => void
  children: React.ReactNode
}) {
  const prog = useSharedValue(0)
  useEffect(() => {
    if (!hoverGrowActive) {
      prog.value = withTiming(0, {
        duration: 240,
        easing: Easing.out(Easing.cubic)
      })
      return
    }
    prog.value = withTiming(isHoverTarget ? 1 : 0, {
      duration: 280,
      easing: Easing.out(Easing.cubic)
    })
  }, [isHoverTarget, hoverGrowActive, prog])
  const growStyle = useAnimatedStyle(() => ({
    minHeight: baseMinH + prog.value * HOVER_DAY_EXPAND_PX
  }))
  return (
    <Animated.View
      ref={(r) => {
        innerRef(r as unknown as View)
      }}
      onLayout={onLayoutCb}
      style={[style, growStyle]}
    >
      {children}
    </Animated.View>
  )
}

/** Pastel blob backgrounds stay light in dark mode — use dark ink for titles */
const BLOB_TITLE_DARK_MODE = '#0f172a'

function MealBlob ({
  event: ev,
  slot,
  mealColor,
  colors,
  blobTitleColor,
  onOpenDay,
  onOpenMeal,
  isDraggingThis,
  onDragBegin,
  onDragMove,
  onDragEnd,
  gesturesDisabled,
  showSlotHeader,
  transformMode,
  onEnterTransformMode,
  onDeletePlannerEvent
}: {
  event: CalendarEvent
  slot: MealSlot
  mealColor?: string
  colors: { text: string; muted: string; primary: string }
  blobTitleColor: string
  onOpenDay: () => void
  onOpenMeal?: () => void
  isDraggingThis: boolean
  onDragBegin: (e: CalendarEvent) => void
  onDragMove: (absoluteX: number, absoluteY: number) => void
  onDragEnd: () => void
  gesturesDisabled?: boolean
  showSlotHeader: boolean
  transformMode: boolean
  onEnterTransformMode: () => void
  onDeletePlannerEvent: (eventId: string) => void | Promise<void>
}) {
  const t = slotTheme(slot, colors.primary, mealColor)
  const rot = useSharedValue(0)

  useEffect(() => {
    if (gesturesDisabled) return
    if (transformMode) {
      rot.value = withRepeat(
        withSequence(
          withTiming(0.9, { duration: 120, easing: Easing.inOut(Easing.sin) }),
          withTiming(-0.9, { duration: 120, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    } else {
      cancelAnimation(rot)
      rot.value = withTiming(0, { duration: 120 })
    }
  }, [transformMode, gesturesDisabled, rot])

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot.value}deg` }]
  }))

  const begin = useCallback(() => onDragBegin(ev), [ev, onDragBegin])
  const move = useCallback(
    (x: number, y: number) => onDragMove(x, y),
    [onDragMove]
  )
  const end = useCallback(() => onDragEnd(), [onDragEnd])
  const open = useCallback(() => {
    if (onOpenMeal) onOpenMeal()
    else onOpenDay()
  }, [onOpenDay, onOpenMeal])

  const panTransform = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(4)
        .onStart(() => {
          runOnJS(begin)()
        })
        .onUpdate((e) => {
          runOnJS(move)(e.absoluteX, e.absoluteY)
        })
        .onEnd(() => {
          runOnJS(end)()
        }),
    [begin, move, end]
  )

  const longPressJiggle = useMemo(
    () =>
      Gesture.LongPress()
        .minDuration(480)
        .onStart(() => {
          runOnJS(onEnterTransformMode)()
        }),
    [onEnterTransformMode]
  )

  const tapOpen = useMemo(
    () =>
      Gesture.Tap()
        .maxDuration(340)
        .onEnd(() => {
          runOnJS(open)()
        }),
    [open]
  )

  const gestureBrowse = useMemo(
    () => Gesture.Exclusive(tapOpen, longPressJiggle),
    [tapOpen, longPressJiggle]
  )

  const cardShadow =
    Platform.OS === 'ios'
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 1, height: 2 },
          shadowOpacity: 0.12,
          shadowRadius: 4
        }
      : { elevation: 3 }

  const blobInner = (
    <>
      {showSlotHeader ? (
        <Text style={[styles.blobSlot, { color: t.accent }]}>{slotLabel(slot)}</Text>
      ) : null}
      <Text style={[styles.blobTitle, { color: blobTitleColor }]} numberOfLines={2}>
        {ev.title || 'Meal'}
      </Text>
    </>
  )

  const blobCard = (
    <Animated.View
      style={[
        styles.stackedBlob,
        shakeStyle,
        {
          backgroundColor: t.bg,
          borderColor: t.accent + '55',
          opacity: isDraggingThis ? 0.35 : 1
        },
        cardShadow
      ]}
    >
      {blobInner}
    </Animated.View>
  )

  if (gesturesDisabled) {
    return (
      <View
        style={[
          styles.stackedBlob,
          {
            backgroundColor: t.bg,
            borderColor: t.accent + '55',
            opacity: isDraggingThis ? 0.35 : 1
          },
          cardShadow
        ]}
      >
        {blobInner}
      </View>
    )
  }

  if (transformMode) {
    return (
      <View style={styles.blobWrap}>
        <GestureDetector gesture={panTransform}>{blobCard}</GestureDetector>
        <Pressable
          style={styles.blobDeleteBtn}
          onPress={() => {
            void onDeletePlannerEvent(ev.id)
          }}
          hitSlop={8}
          accessibilityLabel="Remove meal from week"
        >
          <X size={14} color="#ffffff" />
        </Pressable>
      </View>
    )
  }

  return <GestureDetector gesture={gestureBrowse}>{blobCard}</GestureDetector>
}

function eventsForSlot (events: CalendarEvent[], dk: string, slot: MealSlot): CalendarEvent[] {
  return events.filter((e) => e.date === dk && e.mealSlot === slot)
}

function stackHeight (n: number): number {
  if (n <= 0) return 0
  return n * BLOB_STACK_UNIT + (n - 1) * STACK_GAP
}

/** Min day-cell height: breakfast (top) + lunch (center) + dinner (bottom) with slight overlap */
function dayCellMinHeight (nB: number, nL: number, nD: number): number {
  const hB = stackHeight(nB)
  const hL = stackHeight(nL)
  const hD = stackHeight(nD)
  let merge = 0
  if (nB > 0 && nL > 0) merge += ZONE_MERGE
  if (nL > 0 && nD > 0) merge += ZONE_MERGE
  if (nB > 0 && nD > 0 && nL === 0) merge += ZONE_MERGE
  return Math.max(MEAL_CELL_MIN_H, hB + hL + hD - merge + 8)
}

const WeekTimeGrid = forwardRef<WeekTimeGridHandle, Props>(function WeekTimeGrid (
  {
    weekStart,
    events,
    resolveMealColor,
    onOpenDay,
    onOpenMeal,
    onMoveEventDay,
    onDragActiveChange,
    onDragScreenMove,
    onDragFinger,
    onEventDragBegan,
    onDeletePlannerEvent,
    savedMealDragging = false,
    savedMealDragAt
  },
  ref
) {
  const colors = useThemeColors()
  const { resolvedTheme } = useTheme()
  const weekBlobTitleColor =
    resolvedTheme === 'dark' ? BLOB_TITLE_DARK_MODE : colors.text
  const [transformMode, setTransformMode] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [hoverDateKey, setHoverDateKey] = useState<string | null>(null)
  const wrapRef = useRef<View>(null)
  const rowGeomsRef = useRef<Record<string, { top: number; h: number }>>({})
  const cellScreenRef = useRef<Record<string, { x: number; y: number; w: number; h: number }>>({})
  const blobCellRefs = useRef<Record<string, View | null>>({})
  const draggingIdRef = useRef<string | null>(null)
  const hoverRef = useRef<string | null>(null)
  const hoverSlotRef = useRef<MealSlot | null>(null)
  const endCommittedRef = useRef(false)
  const [eventDragHoverSlot, setEventDragHoverSlot] = useState<MealSlot | null>(null)

  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      return dateKey(d)
    })
  }, [weekStart])

  const savedMealDragActive = savedMealDragging

  useEffect(() => {
    if (savedMealDragActive) setTransformMode(false)
  }, [savedMealDragActive])

  const enterTransformMode = useCallback(() => {
    setTransformMode(true)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
  }, [])

  const exitTransformMode = useCallback(() => {
    setTransformMode(false)
  }, [])

  useImperativeHandle(
    ref,
    () => ({
      resolveSavedMealDrop (absoluteX: number, absoluteY: number) {
        const pad = 8
        for (const dk of weekDates) {
          const c = cellScreenRef.current[dk]
          if (!c || c.w < 8) continue
          if (
            absoluteX >= c.x - pad &&
            absoluteX <= c.x + c.w + pad &&
            absoluteY >= c.y - pad &&
            absoluteY <= c.y + c.h + pad
          ) {
            return { dateKey: dk, slot: slotFromXInCell(absoluteX, c) }
          }
        }
        return null
      }
    }),
    [weekDates]
  )

  const measureCell = useCallback((dk: string) => {
    const node = blobCellRefs.current[dk]
    node?.measureInWindow((x, y, w, h) => {
      cellScreenRef.current[dk] = { x, y, w, h }
    })
  }, [])

  const hitTestLocalY = useCallback(
    (localY: number) => {
      for (const dk of weekDates) {
        const g = rowGeomsRef.current[dk]
        if (g && localY >= g.top - 6 && localY <= g.top + g.h + 6) return dk
      }
      return null
    },
    [weekDates]
  )

  const computeSavedMealHover = (): { dk: string; slot: MealSlot } | null => {
    if (!savedMealDragAt) return null
    const { ax, ay } = savedMealDragAt
    for (const dk of weekDates) {
      const c = cellScreenRef.current[dk]
      if (!c || c.w < 8) continue
      if (ax >= c.x - 6 && ax <= c.x + c.w + 6 && ay >= c.y - 6 && ay <= c.y + c.h + 6) {
        return { dk, slot: slotFromXInCell(ax, c) }
      }
    }
    return null
  }

  const savedHover = savedMealDragActive ? computeSavedMealHover() : null

  const onDragBegin = useCallback(
    (ev: CalendarEvent) => {
      endCommittedRef.current = false
      draggingIdRef.current = ev.id
      hoverRef.current = ev.date
      hoverSlotRef.current = ev.mealSlot
      setDraggingId(ev.id)
      setHoverDateKey(ev.date)
      setEventDragHoverSlot(ev.mealSlot)
      onDragActiveChange?.(true)
      onEventDragBegan?.()
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {})
    },
    [onDragActiveChange, onEventDragBegan]
  )

  const onDragMove = useCallback(
    (absoluteX: number, absoluteY: number) => {
      onDragScreenMove?.(absoluteX, absoluteY)
      const dragId = draggingIdRef.current
      const fromEv = dragId ? events.find((e) => e.id === dragId) : null
      if (fromEv) {
        onDragFinger?.({
          ax: absoluteX,
          ay: absoluteY,
          title: fromEv.title,
          slot: fromEv.mealSlot
        })
      }
      const node = wrapRef.current
      if (!node) return
      node.measure((fx, fy, w, h, pageX, pageY) => {
        const localY = absoluteY - pageY
        const dk = hitTestLocalY(localY)
        hoverRef.current = dk
        setHoverDateKey(dk)
        const pad = 8
        let nextSlot: MealSlot | null = null
        if (dk) {
          const c = cellScreenRef.current[dk]
          if (
            c &&
            c.w >= 8 &&
            absoluteX >= c.x - pad &&
            absoluteX <= c.x + c.w + pad &&
            absoluteY >= c.y - pad &&
            absoluteY <= c.y + c.h + pad
          ) {
            nextSlot = slotFromXInCell(absoluteX, c)
          }
        }
        hoverSlotRef.current = nextSlot
        setEventDragHoverSlot(nextSlot)
      })
    },
    [hitTestLocalY, onDragScreenMove, onDragFinger, events]
  )

  const onDragEnd = useCallback(() => {
    if (endCommittedRef.current) return
    endCommittedRef.current = true
    onDragFinger?.(null)
    const id = draggingIdRef.current
    const hover = hoverRef.current
    const slotPick = hoverSlotRef.current
    const fromEv = id ? events.find((e) => e.id === id) : null
    draggingIdRef.current = null
    hoverRef.current = null
    hoverSlotRef.current = null
    setDraggingId(null)
    setHoverDateKey(null)
    setEventDragHoverSlot(null)
    onDragActiveChange?.(false)
    if (fromEv && hover) {
      const targetSlot = slotPick ?? fromEv.mealSlot
      if (hover !== fromEv.date || targetSlot !== fromEv.mealSlot) {
        onMoveEventDay(fromEv.id, hover, targetSlot).catch(() => {})
      }
    }
    setTimeout(() => {
      endCommittedRef.current = false
    }, 400)
  }, [events, onMoveEventDay, onDragActiveChange, onDragFinger])

  const renderSlotColumn = (
    dk: string,
    slot: MealSlot,
    align: 'top' | 'center' | 'bottom'
  ) => {
    const list = eventsForSlot(events, dk, slot)
    const jc =
      align === 'top'
        ? 'flex-start'
        : align === 'center'
          ? 'center'
          : 'flex-end'
    return (
      <View
        style={[styles.slotColumn, { gap: STACK_GAP, justifyContent: jc }]}
        pointerEvents={transformMode ? 'box-none' : 'auto'}
      >
        {list.map((ev, idx) => (
          <MealBlob
            key={ev.id}
            event={ev}
            slot={slot}
            mealColor={resolveMealColor?.(ev)}
            colors={{ text: colors.text, muted: colors.textMuted, primary: colors.primary }}
            blobTitleColor={weekBlobTitleColor}
            onOpenDay={() => onOpenDay(dk)}
            onOpenMeal={onOpenMeal ? () => onOpenMeal(ev) : undefined}
            isDraggingThis={draggingId === ev.id}
            onDragBegin={onDragBegin}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
            gesturesDisabled={savedMealDragActive}
            showSlotHeader={idx === 0}
            transformMode={transformMode}
            onEnterTransformMode={enterTransformMode}
            onDeletePlannerEvent={onDeletePlannerEvent}
          />
        ))}
      </View>
    )
  }

  return (
    <View
      ref={wrapRef}
      style={[
        styles.wrap,
        {
          backgroundColor: colors.card,
          overflow: transformMode ? 'visible' : 'hidden'
        }
      ]}
      collapsable={false}
    >
      {transformMode ? (
        <Pressable
          onPress={exitTransformMode}
          style={[styles.headerRow, { borderBottomColor: colors.border + '66' }]}
        >
          <Text style={[styles.headerDay, { color: colors.textMuted }]}>Day</Text>
          <Text
            style={[styles.headerHint, { color: colors.primary }]}
            numberOfLines={2}
          >
            Tap outside meals to finish editing
          </Text>
        </Pressable>
      ) : (
        <View style={[styles.headerRow, { borderBottomColor: colors.border + '66' }]}>
          <Text style={[styles.headerDay, { color: colors.textMuted }]}>Day</Text>
          <Text style={[styles.headerMeals, { color: colors.textMuted }]}>Meals</Text>
        </View>
      )}

      {weekDates.map((dk) => {
        const nB = eventsForSlot(events, dk, 'breakfast').length
        const nL = eventsForSlot(events, dk, 'lunch').length
        const nD = eventsForSlot(events, dk, 'dinner').length
        const hasAny = nB + nL + nD > 0
        const isEventDragging = draggingId != null
        const isHoveredEmptyDrop =
          isEventDragging && hoverDateKey === dk && !hasAny && hoverDateKey != null
        const expandedForMeals =
          hasAny || isHoveredEmptyDrop || savedMealDragActive
        const stackedMinH = hasAny ? dayCellMinHeight(nB, nL, nD) : MEAL_CELL_MIN_H
        const cellMinH = expandedForMeals ? stackedMinH : COMPACT_CELL_H
        const isPlannerDragOverDay =
          transformMode &&
          isEventDragging &&
          !savedMealDragActive &&
          hoverDateKey === dk
        const hoverGrowActive =
          transformMode && isEventDragging && !savedMealDragActive
        const rowLooksTall =
          expandedForMeals || (transformMode && isPlannerDragOverDay)
        const showDropHighlight = isHoveredEmptyDrop
        const eventSlotStrip =
          isEventDragging && hoverDateKey === dk && !savedMealDragActive
        const slotHi = savedMealDragActive
          ? savedHover?.dk === dk
            ? savedHover.slot
            : null
          : eventSlotStrip
            ? eventDragHoverSlot
            : null

        return (
          <View
            key={dk}
            onLayout={(e) => {
              const { y, height } = e.nativeEvent.layout
              rowGeomsRef.current[dk] = { top: y, h: height }
            }}
            style={[
              styles.dayRow,
              {
                borderBottomColor: colors.border + '44',
                minHeight:
                  rowLooksTall || hasAny
                    ? undefined
                    : COMPACT_CELL_H + COMPACT_ROW_PAD * 2 + 28
              }
            ]}
          >
            <Pressable
              style={[
                styles.dayTap,
                rowLooksTall || hasAny ? styles.dayTapTall : styles.dayTapCompact
              ]}
              onPress={() =>
                transformMode ? exitTransformMode() : onOpenDay(dk)
              }
              hitSlop={6}
            >
              <Text style={[styles.dayLabel, { color: colors.text }]}>{dayLabelFromDateKey(dk)}</Text>
              <Text style={[styles.dayDate, { color: colors.textMuted }]}>
                {parseDateKey(dk).getDate()}
              </Text>
            </Pressable>

            <AnimatedPlannerBlobCell
              baseMinH={cellMinH}
              isHoverTarget={isPlannerDragOverDay}
              hoverGrowActive={hoverGrowActive}
              innerRef={(r) => {
                blobCellRefs.current[dk] = r
              }}
              onLayoutCb={() => {
                requestAnimationFrame(() => measureCell(dk))
              }}
              style={[
                styles.blobCell,
                {
                  backgroundColor: showDropHighlight
                    ? colors.primary + '18'
                    : colors.background + (expandedForMeals ? '40' : '28'),
                  borderWidth: showDropHighlight ? 2 : 0,
                  borderColor: showDropHighlight ? colors.primary + '88' : 'transparent'
                },
                Platform.OS === 'android' && showDropHighlight ? { borderStyle: 'solid' } : null
              ]}
            >
              {(savedMealDragActive || eventSlotStrip) && (
                <View style={styles.slotStrip} pointerEvents="none">
                  {(['breakfast', 'lunch', 'dinner'] as MealSlot[]).map((sl) => (
                    <View
                      key={sl}
                      style={[
                        styles.slotStripSeg,
                        slotHi === sl && {
                          backgroundColor: colors.primary + '35',
                          borderColor: colors.primary + '90'
                        }
                      ]}
                    >
                      <Text
                        style={[styles.slotStripLabel, { color: colors.textMuted }]}
                        numberOfLines={1}
                      >
                        {sl === 'breakfast' ? 'AM' : sl === 'lunch' ? 'Mid' : 'PM'}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              {transformMode && hasAny && (
                <Pressable
                  style={[StyleSheet.absoluteFillObject, { zIndex: 0 }]}
                  onPress={exitTransformMode}
                />
              )}
              {hasAny && (
                <View
                  style={[
                    styles.threeColumns,
                    {
                      flexGrow: 1,
                      alignSelf: 'stretch',
                      minHeight: cellMinH - 12,
                      zIndex: transformMode ? 2 : 0
                    }
                  ]}
                  pointerEvents={transformMode ? 'box-none' : 'auto'}
                >
                  {renderSlotColumn(dk, 'breakfast', 'top')}
                  {renderSlotColumn(dk, 'lunch', 'center')}
                  {renderSlotColumn(dk, 'dinner', 'bottom')}
                </View>
              )}
              {!hasAny &&
                !isHoveredEmptyDrop &&
                !savedMealDragActive &&
                !transformMode && (
                <Text style={[styles.emptyCompact, { color: colors.textMuted }]}>—</Text>
              )}
              {!hasAny && transformMode && !savedMealDragActive && (
                <Pressable
                  style={[styles.emptyTapExit, { minHeight: Math.max(cellMinH - 8, 48) }]}
                  onPress={exitTransformMode}
                >
                  <Text style={[styles.emptyCompact, { color: colors.textMuted }]}>—</Text>
                </Pressable>
              )}
              {!hasAny && isHoveredEmptyDrop && (
                <Text style={[styles.dropHint, { color: colors.primary }]}>
                  Release to schedule here
                </Text>
              )}
              {savedMealDragActive && !hasAny && (
                <Text style={[styles.dropHintSaved, { color: colors.textMuted }]}>
                  Left · breakfast · Mid · lunch · Right · dinner
                </Text>
              )}
            </AnimatedPlannerBlobCell>
          </View>
        )
      })}
    </View>
  )
})

export default WeekTimeGrid

const DAY_W = 52

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 16,
    overflow: 'hidden'
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  headerDay: {
    width: DAY_W,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3
  },
  headerMeals: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3
  },
  headerHint: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
    textAlign: 'right',
    paddingRight: 4
  },
  blobWrap: {
    position: 'relative',
    width: '100%'
  },
  blobDeleteBtn: {
    position: 'absolute',
    top: -8,
    right: -4,
    zIndex: 30,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(15,23,42,0.88)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyTapExit: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  dayTap: {
    width: DAY_W,
    paddingLeft: 12,
    justifyContent: 'flex-start'
  },
  dayTapCompact: {
    paddingVertical: 8,
    justifyContent: 'center'
  },
  dayTapTall: {
    paddingVertical: 14
  },
  dayLabel: {
    fontSize: 13,
    fontWeight: '800'
  },
  dayDate: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2
  },
  blobCell: {
    flex: 1,
    position: 'relative',
    marginVertical: COMPACT_ROW_PAD,
    marginRight: 8,
    marginLeft: 4,
    borderRadius: 12,
    justifyContent: 'center',
    borderStyle: 'dashed'
  },
  threeColumns: {
    flexDirection: 'row',
    alignItems: 'stretch',
    alignSelf: 'stretch',
    paddingHorizontal: 2,
    paddingVertical: 6,
    zIndex: 2
  },
  slotColumn: {
    flex: 1,
    paddingHorizontal: 3,
    justifyContent: 'flex-start'
  },
  slotStrip: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    borderRadius: 10,
    overflow: 'hidden',
    zIndex: 6
  },
  slotStripSeg: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 4
  },
  slotStripLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.2
  },
  stackedBlob: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
    minHeight: 48,
    width: '100%'
  },
  blobSlot: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2
  },
  blobTitle: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16
  },
  emptyCompact: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '300',
    zIndex: 1
  },
  dropHint: {
    ...StyleSheet.absoluteFillObject,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    paddingTop: MEAL_CELL_MIN_H * 0.38,
    zIndex: 1
  },
  dropHintSaved: {
    position: 'absolute',
    bottom: 6,
    left: 4,
    right: 4,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '600',
    zIndex: 1
  }
})
