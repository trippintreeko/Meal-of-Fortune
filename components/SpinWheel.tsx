import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  PanResponder,
  Easing
} from 'react-native'
import type { ThemeColors } from '@/lib/theme-colors'

const ITEM_HEIGHT = 56
const FULL_WHEEL_DEG = 360
/** 7 faces on visible half → 14 total faces; 360/14 ≈ 25.7° per face so all sides touch through rotation. */
const FACES_VISIBLE_HALF = 7
const PANELS_PER_FULL_WHEEL = FACES_VISIBLE_HALF * 2
const VISIBLE_SLOTS = FACES_VISIBLE_HALF
const WHEEL_VIEW_HEIGHT = ITEM_HEIGHT * VISIBLE_SLOTS
const PADDING_V = ITEM_HEIGHT * 2
const CENTER_OFFSET = WHEEL_VIEW_HEIGHT / 2 - ITEM_HEIGHT / 2
const POINTER_SIZE = 14
/** Central angle per face (360/14) for smooth wheel with all faces touching. */
const ANGLE_PER_FACE_DEG = FULL_WHEEL_DEG / PANELS_PER_FULL_WHEEL
/** Max tilt for outer visible slots (clamped so panels don't flip). */
const MAX_VISIBLE_ANGLE_DEG = 90
/** Larger = zoomed out (wheel appears further away). */
const WHEEL_PERSPECTIVE = 2800

/** Angle between adjacent panels so n panels form a full wheel with no gaps (tangent faces). */
function angleStepForFullWheel (n: number): number {
  return n <= 0 ? FULL_WHEEL_DEG / PANELS_PER_FULL_WHEEL : FULL_WHEEL_DEG / n
}

/** Minimum copies so total panels >= PANELS_PER_FULL_WHEEL for a full tangent wheel. */
function copiesForFullWheel (n: number): number {
  if (n <= 0) return 3
  return Math.max(1, Math.ceil(PANELS_PER_FULL_WHEEL / n))
}
const MIN_COPIES = 3
const DECELERATION = 0.9975
const SNAP_DURATION = 220
const SPEED_THRESHOLD_PX_S = 320
const BLUR_STRIPE_HEIGHT = 18

const DEBUG_SPIN = __DEV__
function logSpin (msg: string, data?: Record<string, unknown>) {
  if (DEBUG_SPIN) {
    const payload = data ? ` ${JSON.stringify(data)}` : ''
    console.log(`[SpinWheel] ${msg}${payload}`)
  }
}

const SEGMENT_COLORS = [
  '#22c55e',
  '#16a34a',
  '#15803d',
  '#0d9488',
  '#0284c7',
  '#2563eb',
  '#7c3aed',
  '#c026d3',
  '#e11d48',
  '#ea580c',
  '#f59e0b',
  '#84cc16'
]

type SpinWheelProps = {
  items: string[]
  onSpinComplete: (selectedIndex: number) => void
  themeColors?: ThemeColors
  onInteractionStart?: () => void
  onInteractionEnd?: () => void
}

/** 7 visible slots: 3 above center, center, 3 below. Offsets -3..0..+3. */
const SLOTS_FROM_CENTER = 5
/** Samples for sinusoidal interpolation. More = smoother sin/cos curve. */
const SINUSOIDAL_SAMPLES = 21
const TWO_PI = Math.PI * 2

/**
 * Wheel angle ↔ scroll position (single source of truth for "spin around the sine rotation").
 * One full wheel rotation = 2π rad = n items → anglePerItem = 2π/n.
 */
function positionYToWheelAngleRad (positionY: number, n: number, middleCopyStart: number): number {
  const slotOffset = (positionY - middleCopyStart + CENTER_OFFSET) / ITEM_HEIGHT
  return n > 0 ? slotOffset * (TWO_PI / n) : 0
}

function wheelAngleRadToPositionY (angleRad: number, n: number, middleCopyStart: number): number {
  return n > 0 ? middleCopyStart - CENTER_OFFSET + (angleRad / TWO_PI) * n * ITEM_HEIGHT : middleCopyStart - CENTER_OFFSET
}

/**
 * Sinusoidal wheel: rotation = sin(relativeAngle), opacity = |cos(relativeAngle)|, scale from cos.
 * relativeAngle = (centerAt - positionY) / ITEM_HEIGHT * (2π/n) so one item scroll = 2π/n rad.
 */
function sinusoidalWheelRanges (centerAt: number, n: number) {
  const anglePerItemRad = n > 0 ? TWO_PI / n : TWO_PI / PANELS_PER_FULL_WHEEL
  const inputRange: number[] = []
  const rotateXOutputRange: string[] = []
  const opacityOutputRange: number[] = []
  const scaleYOutputRange: number[] = []
  const scaleOutputRange: number[] = []
  const step = (2 * SLOTS_FROM_CENTER) / (SINUSOIDAL_SAMPLES - 1)
  for (let i = 0; i < SINUSOIDAL_SAMPLES; i++) {
    const k = -SLOTS_FROM_CENTER + i * step
    const y = centerAt + k * ITEM_HEIGHT
    inputRange.push(y)
    const relativeAngleRad = -k * anglePerItemRad
    const sinA = Math.sin(relativeAngleRad)
    const cosA = Math.cos(relativeAngleRad)
    const absCos = Math.abs(cosA)
    const rotationDeg = Math.max(-MAX_VISIBLE_ANGLE_DEG, Math.min(MAX_VISIBLE_ANGLE_DEG, sinA * MAX_VISIBLE_ANGLE_DEG))
    rotateXOutputRange.push(`${rotationDeg}deg`)
    opacityOutputRange.push(absCos)
    scaleYOutputRange.push(1 + (1 - absCos) * 0.35)
    scaleOutputRange.push(0.7 + 0.3 * absCos)
  }
  return { inputRange, rotateXOutputRange, opacityOutputRange, scaleYOutputRange, scaleOutputRange }
}

const WheelItem = React.memo(function WheelItem ({
  label,
  contentIndex,
  logicalIndex,
  positionY,
  theme,
  itemsCount
}: {
  label: string
  contentIndex: number
  logicalIndex: number
  positionY: Animated.Value
  theme: ThemeColors | undefined
  itemsCount: number
}) {
  const centerAt = PADDING_V + contentIndex * ITEM_HEIGHT + ITEM_HEIGHT / 2 - WHEEL_VIEW_HEIGHT / 2
  const { inputRange, rotateXOutputRange, opacityOutputRange, scaleYOutputRange, scaleOutputRange } = useMemo(
    () => sinusoidalWheelRanges(centerAt, itemsCount),
    [centerAt, itemsCount]
  )

  const opacity = positionY.interpolate({
    inputRange,
    outputRange: opacityOutputRange,
    extrapolate: 'clamp'
  })
  const scale = positionY.interpolate({
    inputRange,
    outputRange: scaleOutputRange,
    extrapolate: 'clamp'
  })
  const rotateX = positionY.interpolate({
    inputRange,
    outputRange: rotateXOutputRange,
    extrapolate: 'clamp'
  })
  const scaleY = positionY.interpolate({
    inputRange,
    outputRange: scaleYOutputRange,
    extrapolate: 'clamp'
  })
  const bg = SEGMENT_COLORS[logicalIndex % SEGMENT_COLORS.length]
  const textColor = theme?.text ?? '#1e293b'

  return (
    <View style={styles.slotClip}>
      <Animated.View
        style={[
          styles.item,
          {
            height: ITEM_HEIGHT,
            backgroundColor: bg,
            opacity,
            transform: [{ scale }, { scaleY }, { rotateX }]
          }
        ]}
      >
        <Text style={[styles.itemText, { color: textColor }]} numberOfLines={1}>
          {label}
        </Text>
      </Animated.View>
    </View>
  )
})

/** Which logical item is at center, using wheel angle (2π/n per item). */
function getLogicalIndexFromY (y: number, n: number, middleCopyStart: number): number {
  if (n <= 0) return 0
  const angleRad = positionYToWheelAngleRad(y, n, middleCopyStart)
  const rawIndex = Math.round((angleRad / TWO_PI) * n)
  return ((rawIndex % n) + n) % n
}

/** positionY that puts this logical index at center (wheel angle = index * 2π/n). */
function getTargetYForIndex (logicalIndex: number, n: number, middleCopyStart: number): number {
  const angleRad = logicalIndex * (TWO_PI / (n > 0 ? n : 1))
  return wheelAngleRadToPositionY(angleRad, n, middleCopyStart)
}

export default function SpinWheel ({ items, onSpinComplete, themeColors, onInteractionStart, onInteractionEnd }: SpinWheelProps) {
  const theme = themeColors
  const n = items.length
  const positionY = useRef(new Animated.Value(0)).current
  const overlayOpacity = useRef(new Animated.Value(0)).current
  const offsetRef = useRef(0)
  const startOffsetRef = useRef(0)
  const animRef = useRef<Animated.CompositeAnimation | null>(null)
  const lastPosRef = useRef(0)
  const lastTimeRef = useRef(0)
  const listenerIdRef = useRef<string | null>(null)
  const overlayAnimRef = useRef<Animated.CompositeAnimation | null>(null)
  const removeSpeedListenerRef = useRef<() => void>(() => {})
  const isOverlayVisibleRef = useRef(false)
  const onInteractionStartRef = useRef(onInteractionStart)
  const onInteractionEndRef = useRef(onInteractionEnd)
  onInteractionStartRef.current = onInteractionStart
  onInteractionEndRef.current = onInteractionEnd

  const copies = useMemo(
    () => Math.max(MIN_COPIES, copiesForFullWheel(n)),
    [n]
  )
  const middleCopyStart = useMemo(() => PADDING_V + Math.floor(copies / 2) * n * ITEM_HEIGHT, [n, copies])
  const totalContentHeight = PADDING_V * 2 + copies * n * ITEM_HEIGHT
  const totalContentHeightRef = useRef(totalContentHeight)
  totalContentHeightRef.current = totalContentHeight
  const blurContentHeight = Math.ceil(totalContentHeight / BLUR_STRIPE_HEIGHT) * BLUR_STRIPE_HEIGHT
  const blurStripes = useMemo(() => {
    const count = Math.ceil(blurContentHeight / BLUR_STRIPE_HEIGHT)
    return Array.from({ length: count }, (_, i) => (
      <View
        key={`blur-${i}`}
        style={[styles.blurStripe, { height: BLUR_STRIPE_HEIGHT, backgroundColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }]}
      />
    ))
  }, [blurContentHeight])

  const removeSpeedListener = useCallback(() => {
    if (listenerIdRef.current != null) {
      positionY.removeListener(listenerIdRef.current)
      listenerIdRef.current = null
    }
    overlayAnimRef.current?.stop()
    overlayOpacity.setValue(0)
    isOverlayVisibleRef.current = false
  }, [positionY, overlayOpacity])

  removeSpeedListenerRef.current = removeSpeedListener

  const runSpin = useCallback((velocity: number) => {
    animRef.current?.stop()
    positionY.stopAnimation((v) => {
      lastPosRef.current = typeof v === 'number' ? v : 0
    })
    lastTimeRef.current = Date.now()

    removeSpeedListener()
    listenerIdRef.current = positionY.addListener(({ value }: { value: number }) => {
      const now = Date.now()
      const dt = (now - lastTimeRef.current) / 1000
      const speed = dt > 0 ? Math.abs(value - lastPosRef.current) / dt : 0
      lastPosRef.current = value
      lastTimeRef.current = now
      overlayAnimRef.current?.stop()
      if (speed >= SPEED_THRESHOLD_PX_S && !isOverlayVisibleRef.current) {
        isOverlayVisibleRef.current = true
        overlayAnimRef.current = Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 80,
          useNativeDriver: true
        })
        overlayAnimRef.current.start(() => { overlayAnimRef.current = null })
      } else if (speed < SPEED_THRESHOLD_PX_S && isOverlayVisibleRef.current) {
        isOverlayVisibleRef.current = false
        overlayAnimRef.current = Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true
        })
        overlayAnimRef.current.start(() => { overlayAnimRef.current = null })
      }
    })

    // logSpin('decay started', { velocity: -velocity })

    animRef.current = Animated.decay(positionY, {
      velocity: -velocity,
      deceleration: DECELERATION,
      useNativeDriver: true
    })
    animRef.current.start(({ finished }) => {
      if (!finished) {
        // logSpin('decay cancelled (e.g. user dragged again)')
        removeSpeedListener()
        return
      }
      removeSpeedListener()
      positionY.stopAnimation((finalY) => {
        const logicalIndex = getLogicalIndexFromY(finalY, n, middleCopyStart)
        const targetY = getTargetYForIndex(logicalIndex, n, middleCopyStart)
        const snapDistance = Math.abs(targetY - finalY)
        const mealLabel = items[logicalIndex]

        // logSpin('decay ended', {
        //   finalY: Math.round(finalY),
        //   logicalIndex,
        //   mealLabel,
        //   targetY: Math.round(targetY),
        //   snapDistance: Math.round(snapDistance),
        //   copyHint: snapDistance > n * ITEM_HEIGHT * 0.5 ? 'normalizing to middle copy (was in another copy)' : 'already near middle copy'
        // })

        offsetRef.current = targetY
        const duration = snapDistance < 10 ? 80 : SNAP_DURATION
        Animated.timing(positionY, {
          toValue: targetY,
          duration,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic)
        }).start(() => {
          onSpinComplete(logicalIndex)
          onInteractionEndRef.current?.()
        })
      })
    })
  }, [n, middleCopyStart, positionY, overlayOpacity, onSpinComplete, items, removeSpeedListener])

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        onInteractionStartRef.current?.()
        removeSpeedListenerRef.current()
        animRef.current?.stop()
        positionY.stopAnimation((v) => {
          offsetRef.current = v
          startOffsetRef.current = v
          // logSpin('pan started', { positionY: Math.round(v) })
        })
      },
      onPanResponderMove: (_, g) => {
        const newOffset = startOffsetRef.current - g.dy
        const maxY = totalContentHeightRef.current - WHEEL_VIEW_HEIGHT
        const clamped = Math.max(0, Math.min(newOffset, maxY))
        offsetRef.current = clamped
        positionY.setValue(clamped)
      },
      onPanResponderRelease: (_, g) => {
        startOffsetRef.current = offsetRef.current
        // logSpin('pan released', { vy: Math.round(g.vy * 10) / 10 })
        runSpin(g.vy)
      }
    })
  ).current

  useEffect(() => {
    if (n === 0) return
    const initialY = getTargetYForIndex(0, n, middleCopyStart)
    offsetRef.current = initialY
    positionY.setValue(initialY)
  }, [n, middleCopyStart, positionY])

  const handleQuickSpin = useCallback(() => {
    if (n === 0) return
    onInteractionStartRef.current?.()
    animRef.current?.stop()
    const randomIndex = Math.floor(Math.random() * n)
    const targetY = getTargetYForIndex(randomIndex, n, middleCopyStart)
    offsetRef.current = targetY
    Animated.timing(positionY, {
      toValue: targetY,
      duration: 400,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic)
    }).start(() => {
      onSpinComplete(randomIndex)
      onInteractionEndRef.current?.()
    })
  }, [n, middleCopyStart, positionY, onSpinComplete])

  if (n === 0) {
    logSpin('wheel blank: no items, ran out of panels to show')
    return null
  }

  const bg = theme?.card ?? '#ffffff'
  const border = theme?.cardBorder ?? '#e2e8f0'
  const muted = theme?.textMuted ?? '#64748b'
  const primary = theme?.primary ?? '#22c55e'

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.hint, { color: muted }]}>Swipe down to spin</Text>

      <View style={[styles.wheelOuter, { backgroundColor: bg, borderColor: border }]}>
        <View style={[styles.pointerTriangle, { borderLeftColor: primary }]} />
        <View style={[styles.pointerTriangle, styles.pointerRight, { borderRightColor: primary }]} />
        <View style={styles.clip} {...panResponder.panHandlers}>
          <Animated.View
            style={[
              styles.content,
              {
                height: totalContentHeight,
                paddingVertical: PADDING_V,
                transform: [
                  { perspective: WHEEL_PERSPECTIVE },
                  { translateY: Animated.multiply(positionY, -1) }
                ]
              }
            ]}
          >
            {Array.from({ length: copies }, (_, copy) =>
              items.map((label, i) => (
                <WheelItem
                  key={`${copy}-${i}`}
                  label={label}
                  contentIndex={copy * n + i}
                  logicalIndex={i}
                  positionY={positionY}
                  theme={theme}
                  itemsCount={n}
                />
              ))
            )}
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.blurOverlay,
              {
                opacity: overlayOpacity
              }
            ]}
          >
            <Animated.View
              style={[
                styles.blurContent,
                {
                  height: blurContentHeight,
                  transform: [{ translateY: Animated.multiply(positionY, -1) }]
                }
              ]}
            >
              {blurStripes}
            </Animated.View>
          </Animated.View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.quickSpinButton, { backgroundColor: primary }]}
        onPress={handleQuickSpin}
      >
        <Text style={styles.quickSpinButtonText}>Quick spin</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    paddingVertical: 20
  },
  hint: {
    fontSize: 14,
    marginBottom: 12,
    fontWeight: '500'
  },
  wheelOuter: {
    width: '100%',
    maxWidth: 320,
    height: WHEEL_VIEW_HEIGHT,
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
    position: 'relative'
  },
  clip: {
    height: WHEEL_VIEW_HEIGHT,
    overflow: 'hidden'
  },
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: WHEEL_VIEW_HEIGHT,
    overflow: 'hidden'
  },
  blurContent: {
    width: '100%'
  },
  blurStripe: {
    width: '100%'
  },
  content: {
    paddingHorizontal: 0
  },
  slotClip: {
    height: ITEM_HEIGHT,
    overflow: 'hidden'
  },
  item: {
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginHorizontal: 0,
    borderRadius: 0,
    backfaceVisibility: 'hidden'
  },
  itemText: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center'
  },
  pointerTriangle: {
    position: 'absolute',
    left: 4,
    top: (WHEEL_VIEW_HEIGHT - POINTER_SIZE * 2) / 2,
    width: 0,
    height: 0,
    borderLeftWidth: POINTER_SIZE,
    borderTopWidth: POINTER_SIZE,
    borderBottomWidth: POINTER_SIZE,
    borderRightWidth: 0,
    borderLeftColor: 'transparent',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    zIndex: 10
  },
  pointerRight: {
    left: undefined,
    right: 4,
    borderLeftWidth: 0,
    borderRightWidth: POINTER_SIZE,
    borderRightColor: 'transparent'
  },
  quickSpinButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 140,
    alignItems: 'center'
  },
  quickSpinButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  }
})
