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

const { width: SW, height: SH } = Dimensions.get('window')
const GAME_DURATION_SEC = 30
const TICK_MS = 40
const BELT_SPEED = 165
const ITEM_RADIUS =  Math.round(20 * 2.5) // 250% bigger images
const BELT_HEIGHT = 64
const GAP_HEIGHT = 52
const ZONE_SIZE = 100
const SPAWN_INTERVAL_MS = 900
const HEADER_H = 48
const BELT4_LEFT = 0
const BELT4_RIGHT = SW / 2

type BeltIndex = 1 | 2 | 3 | 4
type Rank = 0 | 1 | 2 | 3

type BeltItem = {
  id: string
  foodId: string
  imageUrl: string | null
  name: string
  category: string
  belt: BeltIndex
  x: number
}

function getBeltY (belt: BeltIndex): { top: number, mid: number } {
  const belt1Top = HEADER_H
  const belt1Mid = belt1Top + BELT_HEIGHT / 2
  const gap1 = belt1Top + BELT_HEIGHT
  const belt2Top = gap1 + GAP_HEIGHT
  const belt2Mid = belt2Top + BELT_HEIGHT / 2
  const gap2 = belt2Top + BELT_HEIGHT
  const belt3Top = gap2 + GAP_HEIGHT
  const belt3Mid = belt3Top + BELT_HEIGHT / 2
  const gap3 = belt3Top + BELT_HEIGHT
  const belt4Top = gap3 + GAP_HEIGHT
  const belt4Mid = belt4Top + BELT_HEIGHT / 2
  if (belt === 1) return { top: belt1Top, mid: belt1Mid }
  if (belt === 2) return { top: belt2Top, mid: belt2Mid }
  if (belt === 3) return { top: belt3Top, mid: belt3Mid }
  return { top: belt4Top, mid: belt4Mid }
}

const DROP_ROW_TOP = HEADER_H + (BELT_HEIGHT + GAP_HEIGHT) * 3 + BELT_HEIGHT + GAP_HEIGHT
const DROP_ROW_PADDING = 12
const FridgeRect = { left: DROP_ROW_PADDING, top: DROP_ROW_TOP + 8, width: ZONE_SIZE, height: ZONE_SIZE }
const TrashRect = { left: (SW - ZONE_SIZE) / 2, top: DROP_ROW_TOP + 8, width: ZONE_SIZE, height: ZONE_SIZE }
const PlateRect = { left: SW - DROP_ROW_PADDING - ZONE_SIZE, top: DROP_ROW_TOP + 8, width: ZONE_SIZE, height: ZONE_SIZE }

function hitTestZone (x: number, y: number): Rank | null {
  if (x >= FridgeRect.left && x <= FridgeRect.left + FridgeRect.width &&
      y >= FridgeRect.top && y <= FridgeRect.top + FridgeRect.height) return 2
  if (x >= TrashRect.left && x <= TrashRect.left + TrashRect.width &&
      y >= TrashRect.top && y <= TrashRect.top + TrashRect.height) return 0
  if (x >= PlateRect.left && x <= PlateRect.left + PlateRect.width &&
      y >= PlateRect.top && y <= PlateRect.top + PlateRect.height) return 3
  return null
}

function hitTestItem (items: BeltItem[], px: number, py: number): BeltItem | null {
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i]
    const { mid } = getBeltY(it.belt)
    const dx = px - it.x
    const dy = py - mid
    if (dx * dx + dy * dy <= ITEM_RADIUS * ITEM_RADIUS) return it
  }
  return null
}

export default function ConveyorBeltRound ({
  roundPurpose,
  mealType,
  onComplete
}: RoundGameProps) {
  const dislikeIds = useFoodPreferencesStore(s => s.dislikeIds)
  const notTodayIds = useFoodPreferencesStore(s => s.notTodayIds)
  const [foodPool, setFoodPool] = useState<{ id: string; name: string; imageUrl: string | null; category: string }[]>([])
  const [items, setItems] = useState<BeltItem[]>([])
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION_SEC)
  const [gameOver, setGameOver] = useState(false)
  const [ready, setReady] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [dragging, setDragging] = useState<{ item: BeltItem; x: number; y: number } | null>(null)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const spawnRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const nextIdRef = useRef(0)
  const rankedRef = useRef<{ foodId: string; category: string; rank: Rank }[]>([])
  const fallbackIdsRef = useRef<{ base: string | null; protein: string | null; vegetable: string | null }>({
    base: null,
    protein: null,
    vegetable: null
  })
  /** One spawn per food item: shuffled queue of pool items not yet spawned */
  const spawnQueueRef = useRef<{ id: string; name: string; imageUrl: string | null; category: string }[]>([])
  const containerScreenRef = useRef({ x: 0, y: 0 })
  const gameAreaRef = useRef<View>(null)
  const itemsRef = useRef<BeltItem[]>([])
  const draggingRef = useRef<{ item: BeltItem; x: number; y: number } | null>(null)
  itemsRef.current = items
  draggingRef.current = dragging

  const finishGame = useCallback(() => {
    const fb = fallbackIdsRef.current
    if (timerRef.current) clearInterval(timerRef.current)
    if (tickRef.current) clearInterval(tickRef.current)
    if (spawnRef.current) clearInterval(spawnRef.current)
    timerRef.current = null
    tickRef.current = null
    spawnRef.current = null
    setGameOver(true)
    const ranked = rankedRef.current
    const rank2Or3 = ranked.filter(r => r.rank >= 1)
    const result: RoundResult =
      roundPurpose === 'all_ingredients'
        ? (() => {
            const baseIds = rank2Or3.filter(r => r.category === 'base').map(r => r.foodId)
            const proteinIds = rank2Or3.filter(r => r.category === 'protein').map(r => r.foodId)
            const vegetableIds = rank2Or3.filter(r => r.category === 'vegetable').map(r => r.foodId)
            const seasoningIds = rank2Or3.filter(r => r.category === 'seasoning').map(r => r.foodId)
            const garnishIds = rank2Or3.filter(r => r.category === 'garnish').map(r => r.foodId)
            return {
              purpose: 'all_ingredients' as const,
              baseIds: baseIds.length > 0 ? baseIds : [fb.base ?? ''],
              proteinIds: proteinIds.length > 0 ? proteinIds : [fb.protein ?? ''],
              vegetableIds: vegetableIds.length > 0 ? vegetableIds : [fb.vegetable ?? ''],
              seasoningIds,
              garnishIds
            }
          })()
        : roundPurpose === 'base'
          ? {
              purpose: 'base',
              baseIds: rank2Or3.length > 0 ? rank2Or3.map(r => r.foodId) : [fb.base ?? '']
            }
          : roundPurpose === 'protein_vegetable'
            ? (() => {
                const proteinIds = rank2Or3.filter(r => r.category === 'protein').map(r => r.foodId)
                const vegetableIds = rank2Or3.filter(r => r.category === 'vegetable').map(r => r.foodId)
                return {
                  purpose: 'protein_vegetable' as const,
                  proteinIds: proteinIds.length > 0 ? proteinIds : [fb.protein ?? ''],
                  vegetableIds: vegetableIds.length > 0 ? vegetableIds : [fb.vegetable ?? '']
                }
              })()
            : { purpose: 'cooking_method', method: 'grilled' }
    // Defer so we don't update parent/store during this component's commit phase
    setTimeout(() => onComplete(result), 0)
  }, [roundPurpose, onComplete])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (roundPurpose === 'cooking_method') {
        setReady(true)
        setGameOver(true)
        setTimeout(() => onComplete({ purpose: 'cooking_method', method: 'grilled' }), 0)
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
          fallbackIdsRef.current = {
            base: filtered.find((x) => x.category === 'base')?.id ?? null,
            protein: filtered.find((x) => x.category === 'protein')?.id ?? null,
            vegetable: filtered.find((x) => x.category === 'vegetable')?.id ?? null
          }
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
          fallbackIdsRef.current = {
            base: null,
            protein: filtered.find((x) => x.category === 'protein')?.id ?? null,
            vegetable: filtered.find((x) => x.category === 'vegetable')?.id ?? null
          }
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
        fallbackIdsRef.current = {
          base: filtered[0]?.id ?? null,
          protein: null,
          vegetable: null
        }
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

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => (prev <= 1 ? 0 : prev - 1))
    }, 1000)

    spawnQueueRef.current = [...foodPool].sort(() => Math.random() - 0.5)

    const spawnOne = () => {
      const queue = spawnQueueRef.current
      if (queue.length === 0) {
        if (spawnRef.current) clearInterval(spawnRef.current)
        spawnRef.current = null
        return
      }
      const item = queue.shift()!
      setItems(prev => [
        ...prev,
        {
          id: `cb-${nextIdRef.current++}`,
          foodId: item.id,
          name: item.name,
          imageUrl: item.imageUrl,
          category: item.category,
          belt: 1 as BeltIndex,
          x: SW + ITEM_RADIUS
        }
      ])
    }
    spawnOne()
    spawnRef.current = setInterval(spawnOne, SPAWN_INTERVAL_MS) as unknown as ReturnType<typeof setInterval>

    const dt = TICK_MS / 1000
    tickRef.current = setInterval(() => {
      setItems(prev => {
        const next: BeltItem[] = []
        for (const it of prev) {
          if (it.belt === 1) {
            const nx = it.x - BELT_SPEED * dt
            if (nx < -ITEM_RADIUS * 2) {
              next.push({ ...it, belt: 2, x: -ITEM_RADIUS })
            } else {
              next.push({ ...it, x: nx })
            }
          } else if (it.belt === 2) {
            const nx = it.x + BELT_SPEED * dt
            if (nx > SW + ITEM_RADIUS * 2) {
              next.push({ ...it, belt: 3, x: SW + ITEM_RADIUS })
            } else {
              next.push({ ...it, x: nx })
            }
          } else if (it.belt === 3) {
            const nx = it.x - BELT_SPEED * dt
            if (nx < -ITEM_RADIUS * 2) {
              next.push({ ...it, belt: 4, x: BELT4_LEFT + ITEM_RADIUS })
            } else {
              next.push({ ...it, x: nx })
            }
          } else {
            const nx = it.x + BELT_SPEED * dt
            if (nx >= BELT4_RIGHT) {
              rankedRef.current = [...rankedRef.current, { foodId: it.foodId, category: it.category, rank: 0 }]
            } else {
              next.push({ ...it, x: nx })
            }
          }
        }
        return next
      })
    }, TICK_MS)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (tickRef.current) clearInterval(tickRef.current)
      if (spawnRef.current) clearInterval(spawnRef.current)
    }
  }, [ready, gameStarted, gameOver, foodPool.length, finishGame])

  useEffect(() => {
    if (timeLeft === 0 && gameStarted && !gameOver && ready) {
      finishGame()
    }
  }, [timeLeft, gameStarted, gameOver, ready, finishGame])

  const placeItem = useCallback((item: BeltItem, rank: Rank) => {
    rankedRef.current = [...rankedRef.current, { foodId: item.foodId, category: item.category, rank }]
    setItems(prev => prev.filter(i => i.id !== item.id))
    setDragging(null)
  }, [])

  const containerPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (_, g) => {
        const { x: cx, y: cy } = containerScreenRef.current
        const px = g.moveX - cx
        const py = g.moveY - cy
        return hitTestItem(itemsRef.current, px, py) !== null
      },
      onMoveShouldSetPanResponder: (_, g) => {
        const { x: cx, y: cy } = containerScreenRef.current
        const px = g.moveX - cx
        const py = g.moveY - cy
        return hitTestItem(itemsRef.current, px, py) !== null
      },
      onPanResponderGrant: (_, g) => {
        const { x: cx, y: cy } = containerScreenRef.current
        const px = g.moveX - cx
        const py = g.moveY - cy
        const item = hitTestItem(itemsRef.current, px, py)
        if (item) setDragging({ item, x: px, y: py })
      },
      onPanResponderMove: (_, g) => {
        const { x: cx, y: cy } = containerScreenRef.current
        setDragging(prev => prev ? { ...prev, x: g.moveX - cx, y: g.moveY - cy } : null)
      },
      onPanResponderRelease: (_, g) => {
        const { x: cx, y: cy } = containerScreenRef.current
        const px = g.moveX - cx
        const py = g.moveY - cy
        const zone = hitTestZone(px, py)
        const current = draggingRef.current
        if (current?.item && zone !== null) {
          placeItem(current.item, zone)
        } else {
          setDragging(null)
        }
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

  if (roundPurpose === 'cooking_method') {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Complete</Text>
      </View>
    )
  }

  const showIntro = !gameStarted && !gameOver

  return (
    <View style={styles.container}>
      <Modal visible={showIntro} transparent animationType="fade">
        <View style={styles.introOverlay}>
          <View style={styles.introCard}>
            <Text style={styles.introTitle}>Conveyor Belt</Text>
            <Text style={styles.introText}>
              Drag food from the belts to: Trash (don&apos;t want), Fridge (maybe later), or Plate (want now). Food that rolls off the 4th belt falls into the trash.
            </Text>
            <Text style={styles.introText}>You have 30 seconds. Move fast!</Text>
            <TouchableOpacity style={styles.introButton} onPress={() => setGameStarted(true)} activeOpacity={0.8}>
              <Text style={styles.introButtonText}>Start</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.header}>
        <Text style={styles.timer}>{timeLeft}s</Text>
      </View>

      <View
        ref={gameAreaRef}
        style={styles.gameArea}
        onLayout={() => {
          const el = gameAreaRef.current as any
          if (el?.measureInWindow) {
            el.measureInWindow((x: number, y: number) => {
              containerScreenRef.current = { x, y }
            })
          }
        }}
        {...containerPanResponder.panHandlers}
      >
        {/* Belt 1 */}
        <View style={[styles.belt, { top: HEADER_H, height: BELT_HEIGHT }]} />
        <View style={[styles.gapRow, { top: HEADER_H + BELT_HEIGHT, height: GAP_HEIGHT }]} />
        {/* Belt 2 */}
        <View style={[styles.belt, { top: HEADER_H + BELT_HEIGHT + GAP_HEIGHT, height: BELT_HEIGHT }]} />
        <View style={[styles.gapRow, { top: HEADER_H + (BELT_HEIGHT + GAP_HEIGHT) * 2, height: GAP_HEIGHT }]} />
        {/* Belt 3 */}
        <View style={[styles.belt, { top: HEADER_H + (BELT_HEIGHT + GAP_HEIGHT) * 2, height: BELT_HEIGHT }]} />
        <View style={[styles.gapRow, { top: HEADER_H + (BELT_HEIGHT + GAP_HEIGHT) * 3, height: GAP_HEIGHT }]} />
        {/* Belt 4 (half): left half of screen, food moves right into center trash */}
        <View style={[styles.belt, styles.beltHalf, { top: HEADER_H + (BELT_HEIGHT + GAP_HEIGHT) * 3, height: BELT_HEIGHT }]} />
        {/* Drop row: Fridge | Trash | Plate */}
        <View style={styles.dropRow}>
          <View style={[styles.fridgeZone, { position: 'absolute', left: FridgeRect.left, top: 8, width: ZONE_SIZE, height: ZONE_SIZE }]}><Text style={styles.zoneLabel}>Fridge</Text></View>
          <View style={[styles.trashZone, { position: 'absolute', left: TrashRect.left, top: 8, width: ZONE_SIZE, height: ZONE_SIZE }]}><Text style={styles.zoneLabel}>Trash</Text></View>
          <View style={[styles.plateZone, { position: 'absolute', left: PlateRect.left, top: 8, width: ZONE_SIZE, height: ZONE_SIZE }]}><Text style={styles.zoneLabel}>Plate</Text></View>
        </View>

        {items.map(it => {
          if (dragging?.item.id === it.id) return null
          const { mid } = getBeltY(it.belt)
          const source = it.imageUrl ? { uri: it.imageUrl } : null
          return (
            <View
              key={it.id}
              style={[styles.itemCircle, { left: it.x - ITEM_RADIUS, top: mid - ITEM_RADIUS }]}
              pointerEvents="none"
            >
              {source
                ? <Image source={source} style={styles.itemImage} resizeMode="contain" />
                : <View style={styles.itemImageFallback} />}
            </View>
          )
        })}

        {dragging && (() => {
          const source = dragging.item.imageUrl ? { uri: dragging.item.imageUrl } : null
          return (
            <View
              style={[
                styles.itemCircle,
                styles.draggingItem,
                { left: dragging.x - ITEM_RADIUS, top: dragging.y - ITEM_RADIUS }
              ]}
              pointerEvents="none"
            >
              {source
                ? <Image source={source} style={styles.itemImage} resizeMode="contain" />
                : <View style={styles.itemImageFallback} />}
            </View>
          )
        })()}
      </View>

      <View style={styles.footer}>
        <Text style={styles.helpText}>Drag food to Trash, Fridge, or Plate</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e293b'
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
    color: '#1e293b',
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#0f172a',
    minHeight: HEADER_H
  },
  gameArea: {
    flex: 1,
    position: 'relative'
  },
  beltHalf: {
    left: 0,
    width: BELT4_RIGHT
  },
  dropRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: DROP_ROW_TOP,
    height: ZONE_SIZE + 16
  },
  trashZone: {
    backgroundColor: '#64748b',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  zoneLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff'
  },
  timer: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f8fafc'
  },
  belt: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#334155',
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#475569'
  },
  gapRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: GAP_HEIGHT
  },
  fridgeZone: {
    backgroundColor: '#0ea5e9',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  plateZone: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  itemCircle: {
    position: 'absolute',
    width: ITEM_RADIUS * 2,
    height: ITEM_RADIUS * 2,
    borderRadius: ITEM_RADIUS,
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden'
  },
  itemImage: {
    width: ITEM_RADIUS * 2 - 4,
    height: ITEM_RADIUS * 2 - 4
  },
  itemImageFallback: {
    width: ITEM_RADIUS * 2 - 4,
    height: ITEM_RADIUS * 2 - 4,
    borderRadius: ITEM_RADIUS,
    backgroundColor: 'rgba(255,255,255,0.25)'
  },
  draggingItem: {
    zIndex: 100
  },
  itemLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#92400e'
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    backgroundColor: '#0f172a'
  },
  helpText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center'
  }
})
