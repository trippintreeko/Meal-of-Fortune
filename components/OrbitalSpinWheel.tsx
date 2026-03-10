import { useRef, useCallback, useMemo, useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  PanResponder,
  TouchableOpacity
} from 'react-native'
import type { ThemeColors } from '@/lib/theme-colors'
import type { SavedMeal } from '@/types/calendar'

const ORBIT_TRACK_WIDTH = 160
const ORBIT_TRACK_HEIGHT = 260
const ORBIT_RADIUS = 100
const PANEL_WIDTH = 140
const PANEL_HEIGHT = 56
/** Compact dimensions for tiebreaker on results page */
const COMPACT_TRACK_WIDTH = 100
const COMPACT_TRACK_HEIGHT = 120
const COMPACT_RADIUS = 44
const COMPACT_PANEL_WIDTH = 88
const COMPACT_PANEL_HEIGHT = 36
/** Vertical offset so winning panel aligns with stopper triangle tips in compact mode */
const COMPACT_CENTER_OFFSET_Y = 0
const ORBIT_SAMPLES = 36
const DRAG_SCALE = 200
const SWIPE_DURATION_MS = 280
const SWIPE_DURATION_CAP_MS = 12000
/** Max speed (vy) we tune for; at this speed with full slippery we get TARGET_INDICES_AT_MAX_SPEED and 10s duration. */
const MAX_SPEED = 2.5
/** At max speed + full slippery: this many meals pass the stopper. */
const TARGET_INDICES_AT_MAX_SPEED = 200
/** At max speed: time to pass TARGET_INDICES_AT_MAX_SPEED and stop (ms). Duration = indicesPassed * MS_PER_INDEX. */
const DURATION_AT_MAX_INDICES_MS = 10000
const MS_PER_INDEX = DURATION_AT_MAX_INDICES_MS / TARGET_INDICES_AT_MAX_SPEED
/** Spin button: always 2 full revolutions then ease out to a meal. */
const SPIN_BUTTON_REVOLUTIONS = 2
const SPIN_BUTTON_DURATION_MS = 2200
/** At friction=0 (resistance): small phase delta. At friction=1 (slippery): sensitivity so vy=MAX_SPEED gives 200 indices. */
const VELOCITY_SENSITIVITY_MIN = 0.35

function wrap (t: number): number {
  let v = t % 1
  if (v < 0) v += 1
  return v
}

/** YZ plane: depth is Z (sin). Sort back-to-front by depth. */
function orderByDepth (orbitPhase: number, n: number): number[] {
  const t = wrap(orbitPhase)
  const withZ = Array.from({ length: n }, (_, i) => {
    const angle = 2 * Math.PI * (i / n + t)
    const z = Math.sin(angle)
    return { i, z }
  })
  withZ.sort((a, b) => a.z - b.z)
  return withZ.map(({ i }) => i)
}

/** Index of the item at the front (positive Z / foreground) for the given phase. */
function indexAtFront (orbitPhase: number, n: number): number {
  if (n <= 0) return 0
  const t = wrap(orbitPhase)
  let best = 0
  let bestZ = Math.sin(2 * Math.PI * t)
  for (let i = 1; i < n; i++) {
    const z = Math.sin(2 * Math.PI * (i / n + t))
    if (z > bestZ) {
      bestZ = z
      best = i
    }
  }
  return best
}

/** Phase that centers the given winner index on the stoppers (front and center). */
function phaseToCenterWinner (winnerIndex: number, n: number): number {
  if (n <= 0) return 0
  return wrap(0.25 - winnerIndex / n)
}

/** YZ plane: Y = vertical (cos), Z = depth (sin). flipY inverts vertical. flatScale keeps all panels same size (no grow/shrink). */
function orbitRanges (index: number, n: number, radius: number, flipY: boolean = false, flatScale: boolean = false) {
  const inputRange: number[] = []
  const outTranslateY: number[] = []
  const outScale: number[] = []
  for (let k = 0; k <= ORBIT_SAMPLES; k++) {
    const t = k / ORBIT_SAMPLES
    inputRange.push(t)
    const angle = 2 * Math.PI * (index / n + t)
    const y = radius * Math.cos(angle)
    const z = radius * Math.sin(angle)
    outTranslateY.push(flipY ? -y : y)
    if (flatScale) {
      outScale.push(1)
    } else {
      const normalizedZ = (z / radius + 1) / 2
      outScale.push(0.22 + 0.78 * normalizedZ)
    }
  }
  return { inputRange, outTranslateY, outScale }
}

export type SwipeStats = {
  direction: 'up' | 'down'
  speed: number
  indicesPassed: number
  durationMs: number
}

type OrbitalSpinWheelProps = {
  meals: SavedMeal[]
  onSpinComplete: (selectedIndex: number) => void
  /** Called whenever the meal at the stoppers (front) changes, including while spinning */
  onFrontIndexChange?: (index: number) => void
  /** Called after a swipe spin finishes with stats for that swipe */
  onSwipeStats?: (stats: SwipeStats) => void
  themeColors?: ThemeColors
  onInteractionStart?: () => void
  onInteractionEnd?: () => void
  /** When set, wheel runs one automatic spin on mount that lands on this index (tiebreaker mode). No swipe/button. */
  tiebreakerWinnerIndex?: number | null
}

const FRICTION_FACTOR = 0.5
const CENTER_DURATION_MS = 180

function OrbitingMealItem ({
  meal,
  index,
  n,
  orbitPhase,
  theme,
  radius,
  panelWidth,
  panelHeight,
  trackWidth,
  trackHeight,
  flipY,
  flatScale = false
}: {
  meal: SavedMeal
  index: number
  n: number
  orbitPhase: any
  theme: ThemeColors | undefined
  radius: number
  panelWidth: number
  panelHeight: number
  trackWidth: number
  trackHeight: number
  flipY: boolean
  flatScale?: boolean
}) {
  const { inputRange, outTranslateY, outScale } = useMemo(
    () => orbitRanges(index, n, radius, flipY, flatScale),
    [index, n, radius, flipY, flatScale]
  )
  const translateY = orbitPhase.interpolate({ inputRange, outputRange: outTranslateY })
  const scale = orbitPhase.interpolate({ inputRange, outputRange: outScale })
  const bg = theme?.card ?? '#ffffff'
  const border = theme?.cardBorder ?? '#e2e8f0'
  const textColor = theme?.text ?? '#1e293b'

  const centerOffsetY = flatScale ? COMPACT_CENTER_OFFSET_Y : 0
  return (
    <Animated.View
      style={[
        styles.orbitItemBase,
        {
          width: panelWidth,
          height: panelHeight,
          left: trackWidth / 2 - panelWidth / 2,
          top: trackHeight / 2 - panelHeight / 2 + centerOffsetY,
          transform: [{ translateY }, { scale }]
        }
      ]}
    >
      <View style={[styles.titlePanel, { backgroundColor: bg, borderColor: border, minHeight: panelHeight }]}>
        <Text
          style={[styles.titlePanelText, { color: textColor }]}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {meal.title}
        </Text>
      </View>
    </Animated.View>
  )
}

const TIEBREAKER_DELAY_MS = 500

export default function OrbitalSpinWheel ({
  meals,
  onSpinComplete,
  onFrontIndexChange,
  onSwipeStats,
  themeColors,
  onInteractionStart,
  onInteractionEnd,
  tiebreakerWinnerIndex = null
}: OrbitalSpinWheelProps) {
  const n = meals.length
  const orbit = useRef(new Animated.Value(0)).current
  const orbitPhase = useMemo(() => Animated.modulo(orbit, 1), [orbit])
  const orbitRef = useRef(0)
  const lastDyRef = useRef(0)
  const animRef = useRef<Animated.CompositeAnimation | null>(null)
  const onCompleteRef = useRef(onSpinComplete)
  const onFrontRef = useRef(onFrontIndexChange)
  const onSwipeStatsRef = useRef(onSwipeStats)
  const onStartRef = useRef(onInteractionStart)
  const onEndRef = useRef(onInteractionEnd)
  const lastFrontRef = useRef<number>(-1)
  const tiebreakerRanRef = useRef(false)
  onCompleteRef.current = onSpinComplete
  onFrontRef.current = onFrontIndexChange
  onSwipeStatsRef.current = onSwipeStats
  onStartRef.current = onInteractionStart
  onEndRef.current = onInteractionEnd

  const [renderOrder, setRenderOrder] = useState<number[]>(() => orderByDepth(0, n))
  const isTiebreaker = tiebreakerWinnerIndex != null && tiebreakerWinnerIndex >= 0 && tiebreakerWinnerIndex < n

  useEffect(() => {
    if (!isTiebreaker || n === 0 || tiebreakerRanRef.current) return
    tiebreakerRanRef.current = true
    onStartRef.current?.()
    const timer = setTimeout(() => {
      animRef.current?.stop()
      const centerPhase = phaseToCenterWinner(tiebreakerWinnerIndex!, n)
      const target = SPIN_BUTTON_REVOLUTIONS + centerPhase
      orbitRef.current = wrap(target)
      const finalPhase = wrap(target)
      animRef.current = Animated.timing(orbit, {
        toValue: target,
        duration: SPIN_BUTTON_DURATION_MS,
        useNativeDriver: false,
        easing: Easing.out(Easing.cubic)
      })
      animRef.current.start(() => {
        orbit.setValue(finalPhase)
        orbitRef.current = finalPhase
        animRef.current = null
        onCompleteRef.current(tiebreakerWinnerIndex!)
        onEndRef.current?.()
      })
    }, TIEBREAKER_DELAY_MS)
    return () => clearTimeout(timer)
  }, [isTiebreaker, tiebreakerWinnerIndex, n, orbit])

  useEffect(() => {
    if (n === 0) return
    const initialFront = indexAtFront(0, n)
    lastFrontRef.current = initialFront
    onFrontRef.current?.(initialFront)
    const listener = orbit.addListener(({ value }) => {
      const next = orderByDepth(value, n)
      setRenderOrder((prev) =>
        prev.length === next.length && prev.every((v, i) => v === next[i]) ? prev : next
      )
      const front = indexAtFront(value, n)
      if (front !== lastFrontRef.current) {
        lastFrontRef.current = front
        onFrontRef.current?.(front)
      }
    })
    return () => orbit.removeListener(listener)
  }, [orbit, n])

  const animateTo = useCallback(
    (target: number, durationMs?: number, callback?: () => void) => {
      animRef.current?.stop()
      const wrapped = wrap(target)
      orbitRef.current = wrapped
      const duration = durationMs ?? SWIPE_DURATION_MS
      animRef.current = Animated.timing(orbit, {
        toValue: wrapped,
        duration,
        useNativeDriver: false,
        easing: Easing.out(Easing.cubic)
      })
      animRef.current.start(() => {
        animRef.current = null
        callback?.()
      })
    },
    [orbit]
  )

  const centerOnStopper = useCallback(
    (winner: number) => {
      const centerPhase = phaseToCenterWinner(winner, n)
      animateTo(centerPhase, CENTER_DURATION_MS)
    },
    [n, animateTo]
  )
  const centerOnStopperRef = useRef(centerOnStopper)
  centerOnStopperRef.current = centerOnStopper

  const runSpin = useCallback(() => {
    if (n === 0) return
    onStartRef.current?.()
    animRef.current?.stop()
    orbit.stopAnimation((v) => {
      orbitRef.current = wrap(v)
    })
    const current = orbitRef.current
    const randomOffset = Math.random()
    const target = current + SPIN_BUTTON_REVOLUTIONS + randomOffset
    orbitRef.current = wrap(target)
    animRef.current = Animated.timing(orbit, {
      toValue: orbitRef.current,
      duration: SPIN_BUTTON_DURATION_MS,
      useNativeDriver: false,
      easing: Easing.out(Easing.cubic)
    })
    animRef.current.start(() => {
      animRef.current = null
      const winner = indexAtFront(orbitRef.current, n)
      onCompleteRef.current(winner)
      onEndRef.current?.()
      centerOnStopperRef.current(winner)
    })
  }, [orbit, n])

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        onStartRef.current?.()
        animRef.current?.stop()
        lastDyRef.current = 0
        orbit.stopAnimation((v) => {
          orbitRef.current = wrap(v)
        })
      },
      onPanResponderMove: (_, g) => {
        const dyDelta = g.dy - lastDyRef.current
        lastDyRef.current = g.dy
        const phaseDelta = -dyDelta / DRAG_SCALE
        const next = wrap(orbitRef.current + phaseDelta)
        orbitRef.current = next
        orbit.setValue(next)
      },
      onPanResponderRelease: (_, g) => {
        lastDyRef.current = 0
        const vy = g.vy
        const sensitivityMax = TARGET_INDICES_AT_MAX_SPEED / (n * MAX_SPEED)
        const sensitivity =
          VELOCITY_SENSITIVITY_MIN + (sensitivityMax - VELOCITY_SENSITIVITY_MIN) * FRICTION_FACTOR
        const phaseDelta = vy * sensitivity
        if (Math.abs(phaseDelta) < 0.008) {
          onEndRef.current?.()
          return
        }
        const indicesPassed = Math.round(Math.abs(phaseDelta) * n)
        const durationMs = Math.min(
          SWIPE_DURATION_CAP_MS,
          Math.max(SWIPE_DURATION_MS, Math.round(indicesPassed * MS_PER_INDEX))
        )
        const rawSpeed = Math.abs(vy)
        const stats: SwipeStats = {
          direction: vy >= 0 ? 'down' : 'up',
          speed: Math.min(MAX_SPEED, rawSpeed),
          indicesPassed,
          durationMs
        }
        animateTo(orbitRef.current + phaseDelta, durationMs, () => {
          const winner = indexAtFront(orbitRef.current, n)
          onCompleteRef.current(winner)
          onSwipeStatsRef.current?.(stats)
          onEndRef.current?.()
          centerOnStopperRef.current(winner)
        })
      }
    })
  ).current

  if (n === 0) return null

  const muted = themeColors?.textMuted ?? '#64748b'
  const primary = themeColors?.primary ?? '#22c55e'

  const compact = isTiebreaker
  const trackWidth = compact ? COMPACT_TRACK_WIDTH : ORBIT_TRACK_WIDTH
  const trackHeight = compact ? COMPACT_TRACK_HEIGHT : ORBIT_TRACK_HEIGHT
  const radius = compact ? COMPACT_RADIUS : ORBIT_RADIUS
  const panelWidth = compact ? COMPACT_PANEL_WIDTH : PANEL_WIDTH
  const panelHeight = compact ? COMPACT_PANEL_HEIGHT : PANEL_HEIGHT
  const flipY = compact

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.hint, { color: muted }]}>
        {isTiebreaker ? 'Breaking the tie…' : 'Swipe up/down to rotate, or tap Spin to pick a meal'}
      </Text>
      <View style={styles.stopperRow}>
        <View
          style={[
            styles.stopperTriangle,
            styles.stopperLeft,
            compact && styles.stopperTriangleCompact,
            compact && styles.stopperLeftCompact,
            { borderLeftColor: primary }
          ]}
        />
        <View
          style={[styles.orbitTrack, { width: trackWidth, height: trackHeight }]}
          {...(isTiebreaker ? {} : panResponder.panHandlers)}
        >
          {renderOrder.map((orderedIndex) => (
            <OrbitingMealItem
              key={`${meals[orderedIndex].id}-${orderedIndex}`}
              meal={meals[orderedIndex]}
              index={orderedIndex}
              n={n}
              orbitPhase={orbitPhase}
              theme={themeColors}
              radius={radius}
              panelWidth={panelWidth}
              panelHeight={panelHeight}
              trackWidth={trackWidth}
              trackHeight={trackHeight}
              flipY={flipY}
              flatScale={compact}
            />
          ))}
        </View>
        <View
          style={[
            styles.stopperTriangle,
            styles.stopperRight,
            compact && styles.stopperTriangleCompact,
            compact && styles.stopperRightCompact,
            { borderRightColor: primary }
          ]}
        />
      </View>
      {!isTiebreaker && (
        <TouchableOpacity
          style={[styles.spinButton, { backgroundColor: primary }]}
          onPress={runSpin}
        >
          <Text style={styles.spinButtonText}>Spin</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center'
  },
  hint: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12
  },
  stopperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  stopperTriangle: {
    width: 0,
    height: 0,
    borderTopWidth: 14,
    borderBottomWidth: 14,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent'
  },
  stopperTriangleCompact: {
    borderTopWidth: 8,
    borderBottomWidth: 8
  },
  stopperLeft: {
    borderLeftWidth: 22,
    marginRight: 4
  },
  stopperLeftCompact: { borderLeftWidth: 14, marginRight: 2 },
  stopperRight: {
    borderRightWidth: 22,
    marginLeft: 4
  },
  stopperRightCompact: { borderRightWidth: 14, marginLeft: 2 },
  orbitTrack: {
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible'
  },
  orbitItemBase: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center'
  },
  titlePanel: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center'
  },
  titlePanelText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center'
  },
  spinButton: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
    minWidth: 140
  },
  spinButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center'
  }
})
