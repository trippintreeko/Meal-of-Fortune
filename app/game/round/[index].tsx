import { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { useGameSessionStore, ROUND_INDEX_TO_PURPOSE, TOTAL_ROUNDS } from '@/store/game-session'
import { useFoodPreferencesStore } from '@/store/food-preferences-store'
import { getGameById } from '@/lib/game-registry'
import { getAllSpawnableFoodIds } from '@/lib/food-asset-mapping'
import type { RoundPurpose } from '@/types/game-session'
import type { MealType, RoundResult } from '@/types/game-session'

function getCollectedIdsFromRound (r: RoundResult | null): string[] {
  if (r?.purpose !== 'all_ingredients') return []
  const base = r.baseIds ?? []
  const protein = r.proteinIds ?? []
  const veg = r.vegetableIds ?? []
  return [...base, ...protein, ...veg]
}

export default function RoundScreen () {
  const router = useRouter()
  const params = useLocalSearchParams<{ index: string }>()
  const rawIndex = params.index ?? '0'
  const roundIndex = Math.max(0, Math.min(TOTAL_ROUNDS - 1, parseInt(String(rawIndex), 10)))
  const { mealType, gameIds, setRoundResult, setGameAddedNotTodayIds, getResultsForNavigation, roundResults } = useGameSessionStore()
  const markNotCollectedDoneRef = useRef(false)

  useEffect(() => {
    if (roundIndex !== 2 || markNotCollectedDoneRef.current) return
    const r0 = roundResults[0]
    const r1 = roundResults[1]
    const collected = new Set([
      ...getCollectedIdsFromRound(r0),
      ...getCollectedIdsFromRound(r1)
    ])
    const allSpawnable = getAllSpawnableFoodIds()
    const notCollected = allSpawnable.filter((id) => !collected.has(id))
    if (notCollected.length === 0) return
    markNotCollectedDoneRef.current = true
    setGameAddedNotTodayIds(notCollected)
    const { notTodayIds, setNotToday } = useFoodPreferencesStore.getState()
    const merged = [...new Set([...notTodayIds, ...notCollected])]
    void setNotToday(merged)
  }, [roundIndex, roundResults])

  const gameId = gameIds[roundIndex]
  const roundPurpose = ROUND_INDEX_TO_PURPOSE[roundIndex] ?? 'base'
  const game = gameId ? getGameById(gameId) : null
  const GameComponent = game?.component

  const handleComplete = (result: RoundResult) => {
    setRoundResult(roundIndex, result)
    const nextIndex = roundIndex + 1
    if (nextIndex < TOTAL_ROUNDS) {
      ;(router.replace as (href: string) => void)(`/game/round/${nextIndex}`)
    } else {
      const navParams = getResultsForNavigation()
      if (navParams) {
        router.replace({ pathname: '/game/results', params: navParams })
      } else {
        router.replace('/')
      }
    }
  }

  if (mealType == null || !GameComponent) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>
          {mealType == null ? 'Start from home to pick a meal type.' : 'Unknown game.'}
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/')}>
          <Text style={styles.backBtnText}>Go home</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => (router.replace as (href: string) => void)('/')}>
          <ChevronLeft size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.title}>
          Round {roundIndex + 1} of {TOTAL_ROUNDS}
        </Text>
        <Text style={styles.subtitle}>{game?.name ?? gameId}</Text>
      </View>
      <GameComponent
        roundPurpose={roundPurpose as RoundPurpose}
        mealType={mealType as MealType}
        onComplete={handleComplete}
        roundResults={roundResults}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  backButton: { marginRight: 12 },
  title: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  subtitle: { fontSize: 14, color: '#64748b', marginLeft: 8 },
  errorText: { fontSize: 16, color: '#64748b', textAlign: 'center', padding: 24 },
  backBtn: { marginTop: 16, alignSelf: 'center' },
  backBtnText: { fontSize: 16, fontWeight: '600', color: '#22c55e' }
})
