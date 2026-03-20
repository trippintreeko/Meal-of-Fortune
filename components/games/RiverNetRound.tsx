'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  PanResponder,
  TouchableOpacity,
  Modal,
  Image
} from 'react-native'
import type { RoundGameProps } from '@/lib/game-registry'
import type { RoundResult } from '@/types/game-session'
import { supabase } from '@/lib/supabase'
import { useFoodPreferencesStore } from '@/store/food-preferences-store'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')
const COLS = 5
const COL_WIDTH = SCREEN_WIDTH / COLS
const CATCH_ZONE_TOP = SCREEN_HEIGHT - 140
const CATCH_ZONE_BOTTOM = SCREEN_HEIGHT - 80
const FOOD_RADIUS = Math.round(22 * 4.5) // 450% bigger images
const NET_RADIUS = 36
const BASE_SPEED = 3.2
const MAX_SPEED = 5
const GAME_DURATION_SEC = 30
const SPAWN_INTERVAL_MS_MAX = 900
const SPAWN_INTERVAL_MS_MIN = 200
const DOUBLE_SPAWN_CHANCE = 0.65
const TICK_MS = 50
const MIN_VERTICAL_GAP = FOOD_RADIUS * 4

type FloatingFood = {
  id: string
  foodId: string
  imageUrl: string | null
  name: string
  column: number
  y: number
  speed: number
  category?: string
}

export default function RiverNetRound ({
  roundPurpose,
  mealType,
  onComplete
}: RoundGameProps) {
  const dislikeIds = useFoodPreferencesStore(s => s.dislikeIds)
  const notTodayIds = useFoodPreferencesStore(s => s.notTodayIds)
  const [foodPool, setFoodPool] = useState<{ id: string; name: string; imageUrl: string | null; category?: string }[]>([])
  const [foods, setFoods] = useState<FloatingFood[]>([])
  const [netColumn, setNetColumn] = useState(2)
  const [caughtIds, setCaughtIds] = useState<string[]>([])
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION_SEC)
  const [gameOver, setGameOver] = useState(false)
  const [ready, setReady] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(Date.now())
  const lastTickTimeRef = useRef<number>(Date.now())
  const nextSpawnAtRef = useRef<number>(Date.now())
  const nextIdRef = useRef(0)
  const netColumnRef = useRef(netColumn)
  const caughtIdsRef = useRef<string[]>(caughtIds)
  const foodPoolRef = useRef(foodPool)
  const foodsRef = useRef<FloatingFood[]>(foods)

  netColumnRef.current = netColumn
  caughtIdsRef.current = caughtIds
  foodPoolRef.current = foodPool
  foodsRef.current = foods

  const finishGame = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current)
    tickRef.current = null
    setGameOver(true)
    const finalCaught = caughtIdsRef.current
    const pool = foodPoolRef.current
    const getCategory = (foodId: string) => pool.find(p => p.id === foodId)?.category ?? 'base'
    const getFallbackIdFor = (cat: string) => {
      return pool.find(p => p.category === cat)?.id ?? pool[0]?.id ?? ''
    }
    const result: RoundResult =
      roundPurpose === 'all_ingredients'
        ? (() => {
            const baseIds = [...new Set(finalCaught.filter(id => getCategory(id) === 'base'))]
            const proteinIds = [...new Set(finalCaught.filter(id => getCategory(id) === 'protein'))]
            const vegetableIds = [...new Set(finalCaught.filter(id => getCategory(id) === 'vegetable'))]
            const seasoningIds = [...new Set(finalCaught.filter(id => getCategory(id) === 'seasoning'))]
            const garnishIds = [...new Set(finalCaught.filter(id => getCategory(id) === 'garnish'))]
            return {
              purpose: 'all_ingredients' as const,
              baseIds: baseIds.length > 0 ? baseIds : [getFallbackIdFor('base')],
              proteinIds: proteinIds.length > 0 ? proteinIds : [getFallbackIdFor('protein')],
              vegetableIds: vegetableIds.length > 0 ? vegetableIds : [getFallbackIdFor('vegetable')],
              seasoningIds,
              garnishIds
            }
          })()
        : roundPurpose === 'base'
          ? {
              purpose: 'base',
              baseIds: finalCaught.length > 0 ? finalCaught : [getFallbackIdFor('base')]
            }
          : roundPurpose === 'protein_vegetable'
            ? (() => {
                const proteinIds = [...new Set(finalCaught.filter(id => getCategory(id) === 'protein'))]
                const vegetableIds = [...new Set(finalCaught.filter(id => getCategory(id) === 'vegetable'))]
                return {
                  purpose: 'protein_vegetable' as const,
                  proteinIds: proteinIds.length > 0 ? proteinIds : [getFallbackIdFor('protein')],
                  vegetableIds: vegetableIds.length > 0 ? vegetableIds : [getFallbackIdFor('vegetable')]
                }
              })()
            : { purpose: 'cooking_method', method: 'grilled' }
    setTimeout(() => onComplete(result), 0)
  }, [roundPurpose, onComplete])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (roundPurpose === 'cooking_method') {
        setReady(true)
        setGameOver(true)
        const result: RoundResult = { purpose: 'cooking_method', method: 'grilled' }
        setTimeout(() => onComplete(result), 0)
        return
      }

      try {
        const { data, error } = await supabase
          .from('ingredient_assets')
          .select('spoonacular_ingredient_id, name, image_url')
          .order('name')
        if (cancelled) return

        if (error || !data?.length) {
          setFoodPool([])
          setReady(true)
          return
        }

        const avoidIngredientIds = new Set([...dislikeIds, ...notTodayIds])

        if (roundPurpose === 'all_ingredients') {
          const catOrder = ['base', 'protein', 'vegetable', 'seasoning', 'garnish'] as const
          const list = (data ?? []).map((r, idx) => ({
            id: String(r.spoonacular_ingredient_id),
            name: r.name,
            imageUrl: r.image_url ?? null,
            category: catOrder[idx % catOrder.length]
          }))
          const filtered = list.filter((it) => !avoidIngredientIds.has(it.id))
          setFoodPool(filtered)
          setReady(true)
          return
        }

        if (roundPurpose === 'protein_vegetable') {
          const list = (data ?? []).map((r, idx) => ({
            id: String(r.spoonacular_ingredient_id),
            name: r.name,
            imageUrl: r.image_url ?? null,
            category: idx % 2 === 0 ? 'protein' : 'vegetable'
          }))
          const filtered = list.filter((it) => !avoidIngredientIds.has(it.id))
          setFoodPool(filtered)
          setReady(true)
          return
        }

        // roundPurpose === 'base'
        const list = (data ?? []).map((r) => ({
          id: String(r.spoonacular_ingredient_id),
          name: r.name,
          imageUrl: r.image_url ?? null,
          category: 'base'
        }))
        const filtered = list.filter((it) => !avoidIngredientIds.has(it.id))
        setFoodPool(filtered)
        setReady(true)
      } catch {
        if (cancelled) return
        setFoodPool([])
        setReady(true)
      }
    })()
    return () => { cancelled = true }
  }, [roundPurpose, onComplete, dislikeIds, notTodayIds])

  useEffect(() => {
    if (!ready || !gameStarted || gameOver || foodPool.length === 0) return

    const startTime = Date.now()
    startTimeRef.current = startTime
    lastTickTimeRef.current = startTime
    nextSpawnAtRef.current = startTime

    const speedAtProgress = (p: number) => BASE_SPEED + p * (MAX_SPEED - BASE_SPEED)

    const trySpawn = (now: number) => {
      if (foodPoolRef.current.length === 0) return
      const elapsed = (now - startTimeRef.current) / 1000
      const p = Math.min(1, elapsed / GAME_DURATION_SEC)
      const intervalMs =
        SPAWN_INTERVAL_MS_MAX - p * (SPAWN_INTERVAL_MS_MAX - SPAWN_INTERVAL_MS_MIN)
      if (now < nextSpawnAtRef.current) return
      nextSpawnAtRef.current = now + intervalMs

      const spawnY = -FOOD_RADIUS * 2
      const current = foodsRef.current
      const availableColumns = Array.from({ length: COLS }, (_, c) => c).filter((c) => {
        const hasOverlap = current.some(
          (f) => f.column === c && Math.abs(f.y - spawnY) < MIN_VERTICAL_GAP
        )
        return !hasOverlap
      })
      const speed = speedAtProgress(p)
      const spawnTwo = availableColumns.length >= 2 && Math.random() < DOUBLE_SPAWN_CHANCE
      const newFoods: FloatingFood[] = []
      const pool = foodPoolRef.current

      if (spawnTwo) {
        const colA = availableColumns[Math.floor(Math.random() * availableColumns.length)]
        let colB = availableColumns[Math.floor(Math.random() * availableColumns.length)]
        while (colB === colA && availableColumns.length > 1) {
          colB = availableColumns[Math.floor(Math.random() * availableColumns.length)]
        }
        const itemA = pool[Math.floor(Math.random() * pool.length)]
        const itemB = pool[Math.floor(Math.random() * pool.length)]
        newFoods.push(
          {
            id: `f-${nextIdRef.current++}`,
            foodId: itemA.id,
            name: itemA.name,
            imageUrl: itemA.imageUrl,
            column: colA,
            y: spawnY,
            speed,
            category: itemA.category
          },
          {
            id: `f-${nextIdRef.current++}`,
            foodId: itemB.id,
            name: itemB.name,
            imageUrl: itemB.imageUrl,
            column: colB,
            y: spawnY,
            speed,
            category: itemB.category
          }
        )
      } else {
        const column =
          availableColumns.length > 0
            ? availableColumns[Math.floor(Math.random() * availableColumns.length)]
            : Math.floor(Math.random() * COLS)
        const item = pool[Math.floor(Math.random() * pool.length)]
        newFoods.push({
          id: `f-${nextIdRef.current++}`,
          foodId: item.id,
          name: item.name,
          imageUrl: item.imageUrl,
          column,
          y: spawnY,
          speed,
          category: item.category
        })
      }
      setFoods((prev) => [...prev, ...newFoods])
    }

    tickRef.current = setInterval(() => {
      const now = Date.now()
      const elapsed = (now - startTimeRef.current) / 1000

      if (elapsed >= GAME_DURATION_SEC) {
        finishGame()
        return
      }

      setTimeLeft(Math.max(0, GAME_DURATION_SEC - Math.floor(elapsed)))

      const dt = Math.min((now - lastTickTimeRef.current) / 1000, 0.2)
      lastTickTimeRef.current = now

      trySpawn(now)

      setFoods((prev) => {
        const next: FloatingFood[] = []
        const toCatch: string[] = []
        for (const f of prev) {
          const newY = f.y + f.speed * dt * 60
          if (newY > SCREEN_HEIGHT + FOOD_RADIUS) continue
          const inCatchZone =
            newY + FOOD_RADIUS >= CATCH_ZONE_TOP &&
            newY - FOOD_RADIUS <= CATCH_ZONE_BOTTOM &&
            f.column === netColumnRef.current
          if (inCatchZone) {
            toCatch.push(f.foodId)
            continue
          }
          next.push({ ...f, y: newY })
        }
        if (toCatch.length > 0) {
          caughtIdsRef.current = [...caughtIdsRef.current, ...toCatch]
          setCaughtIds((ids) => [...ids, ...toCatch])
        }
        return next
      })
    }, TICK_MS)

    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
    }
  }, [ready, gameStarted, gameOver, foodPool.length, finishGame])

  useEffect(() => {
    if (timeLeft === 0 && gameStarted && !gameOver && ready) {
      finishGame()
    }
  }, [timeLeft, gameStarted, gameOver, ready, finishGame])

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        const col = Math.max(0, Math.min(COLS - 1, Math.floor(gesture.moveX / COL_WIDTH)))
        setNetColumn(col)
      }
    })
  ).current

  if (!ready) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    )
  }

  const showIntro = (roundPurpose === 'base' || roundPurpose === 'protein_vegetable' || roundPurpose === 'all_ingredients') && !gameStarted && !gameOver

  return (
    <View style={styles.container}>
      <Modal
        visible={showIntro}
        transparent
        animationType="fade"
      >
        <View style={styles.introOverlay}>
          <View style={styles.introCard}>
            <Text style={styles.introTitle}>River Net</Text>
            <Text style={styles.introText}>
              Food floats down the river in five columns. Swipe left or right to move your net into a column.
            </Text>
            <Text style={styles.introText}>
              Catch the food circles you want as they pass the bridge. You have 30 seconds—food speeds up as time runs down!
            </Text>
            <TouchableOpacity
              style={styles.introButton}
              onPress={() => setGameStarted(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.introButtonText}>Start</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <View style={styles.river} {...panResponder.panHandlers}>
        <View style={styles.columns}>
          {Array.from({ length: COLS }, (_, c) => c).map((c) => (
            <View key={c} style={[styles.column, c < COLS - 1 && styles.columnBorder]} />
          ))}
        </View>

        {foods.map((f) => {
          const cx = f.column * COL_WIDTH + COL_WIDTH / 2
          return (
            <View
              key={f.id}
              style={[
                styles.foodCircle,
                {
                  left: cx - FOOD_RADIUS,
                  top: f.y - FOOD_RADIUS,
                  width: FOOD_RADIUS * 2,
                  height: FOOD_RADIUS * 2,
                  borderRadius: FOOD_RADIUS
                }
              ]}>
              {f.imageUrl
                ? <Image source={{ uri: f.imageUrl }} style={styles.foodImage} resizeMode="contain" />
                : <View style={styles.foodImageFallback} />}
            </View>
          )
        })}

        <View style={styles.bridge}>
          <View
            style={[
              styles.net,
              {
                left: netColumn * COL_WIDTH + COL_WIDTH / 2 - NET_RADIUS,
                width: NET_RADIUS * 2,
                height: NET_RADIUS * 2,
                borderRadius: NET_RADIUS
              }
            ]}
          />
        </View>
      </View>

      <View style={styles.hud}>
        <Text style={styles.timer}>{timeLeft}s</Text>
        <Text style={styles.caught}>Caught: {caughtIds.length}</Text>
      </View>

      <View style={styles.instructions}>
        <Text style={styles.instructionsText}>
          Swipe left or right to move the net. Catch food as it floats by!
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c4a6e'
  },
  loadingText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    padding: 24
  },
  introOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  introCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    maxWidth: 340
  },
  introTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0c4a6e',
    textAlign: 'center',
    marginBottom: 16
  },
  introText: {
    fontSize: 15,
    color: '#334155',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 22
  },
  introButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    marginTop: 8,
    alignItems: 'center'
  },
  introButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff'
  },
  river: {
    flex: 1,
    backgroundColor: '#0ea5e9',
    overflow: 'hidden'
  },
  columns: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row'
  },
  column: {
    flex: 1,
    backgroundColor: 'transparent'
  },
  columnBorder: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.25)'
  },
  foodCircle: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden'
  },
  foodImage: {
    width: FOOD_RADIUS * 2 - 4,
    height: FOOD_RADIUS * 2 - 4
  },
  foodImageFallback: {
    width: FOOD_RADIUS * 2 - 4,
    height: FOOD_RADIUS * 2 - 4,
    borderRadius: FOOD_RADIUS,
    backgroundColor: 'rgba(255,255,255,0.25)'
  },
  foodLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400e'
  },
  bridge: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 90,
    backgroundColor: '#78350f',
    borderTopWidth: 4,
    borderTopColor: '#92400e',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  netZone: {
    position: 'absolute',
    bottom: 0,
    top: 0
  },
  net: {
    position: 'absolute',
    bottom: 50,
    backgroundColor: '#22c55e',
    borderWidth: 4,
    borderColor: '#15803d',
    justifyContent: 'center',
    alignItems: 'center'
  },
  hud: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#0c4a6e'
  },
  timer: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff'
  },
  caught: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7dd3fc'
  },
  instructions: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#0c4a6e'
  },
  instructionsText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center'
  },
  otherRoundWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  otherRoundText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 24
  },
  continueBtn: {
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12
  },
  continueBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff'
  }
})
