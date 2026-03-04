import { useRef, useCallback, useMemo, useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  PanResponder
} from 'react-native'
import { useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { useThemeColors } from '@/hooks/useTheme'
import { getFoodAssetSource } from '@/lib/food-asset-registry'
import type { FoodAssetKey } from '@/lib/food-asset-mapping'
import { Image } from 'react-native'

const SAMPLE_FOOD_KEYS: FoodAssetKey[] = ['rice', 'ramen', 'bread', 'chicken', 'beef', 'fish']

const SAMPLE_CSS = `.wheel-item {
  height: 56px;
  border-radius: 8px;
  justify-content: center;
  align-items: center;
}
.wheel-segment {
  background-color: var(--segment-color);
}`

const ORBIT_TRACK_WIDTH = 280
const ORBIT_TRACK_HEIGHT = 72
const ORBIT_RADIUS = 100
const ITEM_SIZE = 48
const ORBIT_SAMPLES = 36
const DRAG_SCALE = 200
const SWIPE_DURATION_MS = 280

function wrap (t: number): number {
  let v = t % 1
  if (v < 0) v += 1
  return v
}

/** Indices sorted back-to-front by depth (y) so rendering last = on top; avoids relying on zIndex. */
function orderByDepth (orbitPhase: number, n: number): number[] {
  const t = wrap(orbitPhase)
  const withY = Array.from({ length: n }, (_, i) => {
    const angle = 2 * Math.PI * (i / n + t)
    const y = Math.sin(angle)
    return { i, y }
  })
  withY.sort((a, b) => a.y - b.y)
  return withY.map(({ i }) => i)
}

/**
 * View on XZ plane: X = horizontal (right to left). Y = depth (scale only).
 * Occlusion is handled by render order (back-to-front), not zIndex.
 */
function orbitRanges (index: number, n: number, radius: number) {
  const inputRange: number[] = []
  const outTranslateX: number[] = []
  const outScale: number[] = []
  for (let k = 0; k <= ORBIT_SAMPLES; k++) {
    const t = k / ORBIT_SAMPLES
    inputRange.push(t)
    const angle = 2 * Math.PI * (index / n + t)
    const x = radius * Math.cos(angle)
    const y = radius * Math.sin(angle)
    outTranslateX.push(x)
    const normalizedY = (y / radius + 1) / 2
    outScale.push(0.22 + 0.78 * normalizedY)
  }
  return { inputRange, outTranslateX, outScale }
}

function OrbitingFoodItem ({
  keyName,
  index,
  orbit,
  colors
}: {
  keyName: FoodAssetKey
  index: number
  orbit: Animated.Value
  colors: ReturnType<typeof useThemeColors>
}) {
  const { inputRange, outTranslateX, outScale } = useMemo(
    () => orbitRanges(index, SAMPLE_FOOD_KEYS.length, ORBIT_RADIUS),
    [index]
  )

  const translateX = orbit.interpolate({ inputRange, outputRange: outTranslateX })
  const scale = orbit.interpolate({ inputRange, outputRange: outScale })

  return (
    <Animated.View
      style={[
        styles.orbitItem,
        {
          width: ITEM_SIZE,
          height: ITEM_SIZE,
          transform: [{ translateX }, { scale }]
        }
      ]}
    >
      <View style={[styles.orbitItemInner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Image source={getFoodAssetSource(keyName)} style={styles.orbitItemImage} resizeMode="contain" />
      </View>
    </Animated.View>
  )
}

export default function SpinStylesScreen () {
  const router = useRouter()
  const colors = useThemeColors()
  const orbit = useRef(new Animated.Value(0)).current
  const orbitRef = useRef(0)
  const lastDxRef = useRef(0)
  const animRef = useRef<Animated.CompositeAnimation | null>(null)

  const [renderOrder, setRenderOrder] = useState<number[]>(() =>
    orderByDepth(0, SAMPLE_FOOD_KEYS.length)
  )

  useEffect(() => {
    const listener = orbit.addListener(({ value }) => {
      const next = orderByDepth(value, SAMPLE_FOOD_KEYS.length)
      setRenderOrder((prev) =>
        prev.length === next.length && prev.every((v, i) => v === next[i]) ? prev : next
      )
    })
    return () => orbit.removeListener(listener)
  }, [orbit])

  const animateTo = useCallback(
    (target: number) => {
      animRef.current?.stop()
      const wrapped = wrap(target)
      orbitRef.current = wrapped
      animRef.current = Animated.timing(orbit, {
        toValue: wrapped,
        duration: SWIPE_DURATION_MS,
        useNativeDriver: false,
        easing: Easing.out(Easing.cubic)
      })
      animRef.current.start(() => {
        animRef.current = null
      })
    },
    [orbit]
  )

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        animRef.current?.stop()
        lastDxRef.current = 0
        orbit.stopAnimation((v) => {
          orbitRef.current = wrap(v)
        })
      },
      onPanResponderMove: (_, g) => {
        const dxDelta = g.dx - lastDxRef.current
        lastDxRef.current = g.dx
        const phaseDelta = -dxDelta / DRAG_SCALE
        const next = wrap(orbitRef.current + phaseDelta)
        orbitRef.current = next
        orbit.setValue(next)
      },
      onPanResponderRelease: (_, g) => {
        lastDxRef.current = 0
        const vx = g.vx
        const phaseDelta = -vx * 0.35
        if (Math.abs(phaseDelta) < 0.008) return
        animateTo(orbitRef.current + phaseDelta)
      }
    })
  ).current

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Wheel styles</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Food assets (swipe to scroll)</Text>
        <View
          style={[styles.orbitTrack, { width: ORBIT_TRACK_WIDTH, height: ORBIT_TRACK_HEIGHT }]}
          {...panResponder.panHandlers}
        >
          {renderOrder.map((orderedIndex) => (
            <OrbitingFoodItem
              key={SAMPLE_FOOD_KEYS[orderedIndex]}
              keyName={SAMPLE_FOOD_KEYS[orderedIndex]}
              index={orderedIndex}
              orbit={orbit}
              colors={colors}
            />
          ))}
        </View>
        <Text style={[styles.hint, { color: colors.textMuted }]}>Swipe left or right to spin the orbit</Text>

        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>CSS styles block</Text>
        <View style={[styles.cssBlock, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.cssText, { color: colors.text }]} selectable>
            {SAMPLE_CSS}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.backToSpinButton, { backgroundColor: colors.primary }]}
          onPress={() => router.replace('/game/spin')}
        >
          <Text style={styles.backToSpinButtonText}>Back to Spin to pick</Text>
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
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 12
  },
  orbitTrack: {
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible'
  },
  hint: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4
  },
  orbitItem: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    left: ORBIT_TRACK_WIDTH / 2 - ITEM_SIZE / 2,
    top: ORBIT_TRACK_HEIGHT / 2 - ITEM_SIZE / 2
  },
  orbitItemInner: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: ITEM_SIZE / 2,
    borderWidth: 1,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden'
  },
  orbitItemImage: {
    width: '100%',
    height: '100%'
  },
  cssBlock: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginTop: 8
  },
  cssText: {
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 20
  },
  backToSpinButton: {
    marginTop: 28,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  backToSpinButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  }
})
