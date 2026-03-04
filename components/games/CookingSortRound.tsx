'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal
} from 'react-native'
import type { RoundGameProps } from '@/lib/game-registry'
import type { RoundResult } from '@/types/game-session'
import {
  MEAL_COOKING_METHODS,
  COOKING_METHOD_LABELS,
  normalizeCookingMethodFromDb,
  type CookingMethodId
} from '@/lib/cooking-methods'
import { supabase } from '@/lib/supabase'
import { useFoodPreferencesStore } from '@/store/food-preferences-store'

type GalleryRow = {
  id: string
  base_id: string | null
  protein_id: string | null
  vegetable_id: string | null
  cooking_method: string | null
}

/** Derive collected base/protein/vegetable IDs from round 0 and 1 (same merge as getResultsForNavigation). */
function getCollectedIdsFromRounds (roundResults: (RoundResult | null)[] | undefined): { baseIds: string[]; proteinIds: string[]; vegetableIds: string[] } | null {
  if (!roundResults?.length) return null
  const r0 = roundResults[0]
  const r1 = roundResults[1]
  const getR0 = () => {
    if (r0?.purpose === 'all_ingredients') return { baseIds: r0.baseIds ?? [], proteinIds: r0.proteinIds ?? [], vegetableIds: r0.vegetableIds ?? [] }
    if (r0?.purpose === 'base') return { baseIds: r0.baseIds ?? [], proteinIds: [] as string[], vegetableIds: [] as string[] }
    return { baseIds: [] as string[], proteinIds: [] as string[], vegetableIds: [] as string[] }
  }
  const getR1 = () => {
    if (r1?.purpose === 'all_ingredients') return { baseIds: r1.baseIds ?? [], proteinIds: r1.proteinIds ?? [], vegetableIds: r1.vegetableIds ?? [] }
    if (r1?.purpose === 'protein_vegetable') return { baseIds: [] as string[], proteinIds: r1.proteinIds ?? [], vegetableIds: r1.vegetableIds ?? [] }
    return { baseIds: [] as string[], proteinIds: [] as string[], vegetableIds: [] as string[] }
  }
  const a = getR0()
  const b = getR1()
  const baseIds = [...new Set([...a.baseIds, ...b.baseIds])]
  const proteinIds = [...new Set([...a.proteinIds, ...b.proteinIds])]
  const vegetableIds = [...new Set([...a.vegetableIds, ...b.vegetableIds])]
  if (baseIds.length === 0 || proteinIds.length === 0 || vegetableIds.length === 0) return null
  return { baseIds, proteinIds, vegetableIds }
}

/** Count gallery meals for this method: method match, exclude only disliked, include if at least 2 of 3 ingredients collected. */
function countMealsForMethod (
  method: CookingMethodId,
  collected: { baseIds: string[]; proteinIds: string[]; vegetableIds: string[] },
  dislikeSet: Set<string>,
  rows: GalleryRow[]
): number {
  const baseSet = new Set(collected.baseIds)
  const proteinSet = new Set(collected.proteinIds)
  const vegetableSet = new Set(collected.vegetableIds)
  return rows.filter(row => {
    const base = row.base_id ?? ''
    const protein = row.protein_id ?? ''
    const vegetable = row.vegetable_id ?? ''
    if (dislikeSet.has(base) || dislikeSet.has(protein) || dislikeSet.has(vegetable)) return false
    const matchCount = [baseSet.has(base), proteinSet.has(protein), vegetableSet.has(vegetable)].filter(Boolean).length
    if (matchCount < 2) return false
    const normalized = normalizeCookingMethodFromDb(row.cooking_method ?? undefined)
    return normalized === method
  }).length
}

export default function CookingSortRound ({
  roundPurpose,
  onComplete,
  roundResults
}: RoundGameProps) {
  const [gameOver, setGameOver] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [selected, setSelected] = useState<Set<CookingMethodId>>(new Set())
  const [mealCountByMethod, setMealCountByMethod] = useState<Record<string, number> | null>(null)
  const dislikeIds = useFoodPreferencesStore(s => s.dislikeIds)

  const totalAllMethods = useMemo(() => {
    if (!mealCountByMethod) return 0
    return MEAL_COOKING_METHODS.reduce((sum, m) => sum + (mealCountByMethod[m] ?? 0), 0)
  }, [mealCountByMethod])

  const displayedMealCount = useMemo(() => {
    if (!mealCountByMethod) return null
    if (selected.size === 0) return totalAllMethods
    const unselectedSum = MEAL_COOKING_METHODS
      .filter(m => !selected.has(m))
      .reduce((sum, m) => sum + (mealCountByMethod[m] ?? 0), 0)
    return totalAllMethods - unselectedSum
  }, [mealCountByMethod, selected, totalAllMethods])

  const finishGame = useCallback(() => {
    setGameOver(true)
    const methods = Array.from(selected)
    const result: RoundResult = {
      purpose: 'cooking_method',
      methods: methods.length > 0 ? methods : ['grill']
    }
    onComplete(result)
  }, [onComplete, selected])

  useEffect(() => {
    if (roundPurpose !== 'cooking_method') {
      setTimeout(() => onComplete({ purpose: 'cooking_method', methods: ['grill'] }), 0)
      return
    }
  }, [roundPurpose, onComplete])

  useEffect(() => {
    if (roundPurpose !== 'cooking_method') return
    const collected = getCollectedIdsFromRounds(roundResults)
    if (!collected) {
      setMealCountByMethod({})
      return
    }
    const collectedIds = collected
    let cancelled = false
    const dislikeSet = new Set(dislikeIds)

    async function load () {
      const { data, error } = await supabase
        .from('gallery_meals')
        .select('id, base_id, protein_id, vegetable_id, cooking_method')
        .order('sort_order')
      if (cancelled) return
      if (error) {
        setMealCountByMethod({})
        return
      }
      const rows = (data ?? []) as GalleryRow[]
      const counts: Record<string, number> = {}
      for (const method of MEAL_COOKING_METHODS) {
        counts[method] = countMealsForMethod(method, collectedIds, dislikeSet, rows)
      }
      setMealCountByMethod(counts)
    }
    load()
    return () => { cancelled = true }
  }, [roundPurpose, roundResults, dislikeIds])

  const toggleMethod = useCallback((method: CookingMethodId) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(method)) next.delete(method)
      else next.add(method)
      return next
    })
  }, [])

  const handleDone = useCallback(() => {
    finishGame()
  }, [finishGame])

  if (roundPurpose !== 'cooking_method') {
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
            <Text style={styles.introTitle}>How do you want this food prepared?</Text>
            <Text style={styles.introText}>
              Tap one or more cooking methods. All the food you gathered in the previous rounds will be prepared using only these methods. Tap Done when ready.
            </Text>
            <TouchableOpacity style={styles.introButton} onPress={() => setGameStarted(true)} activeOpacity={0.8}>
              <Text style={styles.introButtonText}>Start</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.header}>
        <Text style={styles.prompt}>How do you want this food prepared?</Text>
      </View>

      <View style={styles.buckets}>
        {MEAL_COOKING_METHODS.map(method => {
          const count = mealCountByMethod?.[method] ?? null
          const label = count !== null
            ? `${COOKING_METHOD_LABELS[method]} (${count})`
            : COOKING_METHOD_LABELS[method]
          return (
            <TouchableOpacity
              key={method}
              style={[styles.bucket, selected.has(method) && styles.bucketSelected]}
              onPress={() => toggleMethod(method)}
              activeOpacity={0.7}
              disabled={gameOver}
            >
              <Text style={styles.bucketLabel} numberOfLines={1}>
                {label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <View style={styles.mealCountFooter}>
        <Text style={styles.mealCountText}>
          {mealCountByMethod
            ? selected.size > 0
              ? `You'll create ${Array.from(selected).reduce((sum, m) => sum + (mealCountByMethod[m] ?? 0), 0)} meals with your selection`
              : `Tap Done to use Grill — ${mealCountByMethod.grill ?? 0} meals`
            : 'Loading meal counts…'}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.doneButton}
        onPress={handleDone}
        disabled={gameOver}
        activeOpacity={0.8}
      >
        <Text style={styles.doneButtonText}>Done</Text>
      </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#0f172a',
    alignItems: 'center'
  },
  prompt: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f8fafc',
    textAlign: 'center'
  },
  buckets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    padding: 12,
    gap: 10,
    backgroundColor: '#1e293b'
  },
  bucket: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#334155',
    minWidth: 90
  },
  bucketSelected: {
    backgroundColor: '#22c55e'
  },
  bucketLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center'
  },
  mealCountFooter: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    minHeight: 44
  },
  mealCountText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94a3b8',
    textAlign: 'center'
  },
  doneButton: {
    marginHorizontal: 20,
    marginBottom: 24,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#22c55e',
    alignItems: 'center'
  },
  doneButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff'
  }
})
