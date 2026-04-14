import { useCallback } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { useGameSessionStore, ROUND_INDEX_TO_PURPOSE, TOTAL_ROUNDS } from '@/store/game-session'
import { useFoodPreferencesStore } from '@/store/food-preferences-store'
import { getGameById } from '@/lib/game-registry'
import { supabase } from '@/lib/supabase'
import { buildIngredientGroupIndex, expandIdsByIngredientGroups } from '@/lib/ingredient-grouping'
import type { RoundPurpose } from '@/types/game-session'
import type { MealType, RoundResult } from '@/types/game-session'
import { useSystemBack } from '@/hooks/useSystemBack'
import GameRoundErrorBoundary from '@/components/games/GameRoundErrorBoundary'
import { clearGameAddedNotTodayFromPreferences } from '@/store/game-session'

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

  const handleBackToHome = useCallback(() => {
    void clearGameAddedNotTodayFromPreferences()
    ;(router.replace as (href: string) => void)('/')
  }, [router])

  useSystemBack(handleBackToHome)

  const gameId = gameIds[roundIndex]
  const roundPurpose = ROUND_INDEX_TO_PURPOSE[roundIndex] ?? 'base'
  const game = gameId ? getGameById(gameId) : null
  const GameComponent = game?.component

  const handleComplete = (result: RoundResult) => {
    const nextIndex = roundIndex + 1
    const nextRoundResults = [...roundResults]
    nextRoundResults[roundIndex] = result

    setRoundResult(roundIndex, result)

    if (nextIndex < TOTAL_ROUNDS) {
      ;(router.replace as (href: string) => void)(`/game/round/${nextIndex}`)
      return
    }

    // This is the last round: populate "not today" for uncollected ingredients
    // *after* the player finished collecting, so the last ingredient round
    // does not get artificially restricted.
    void (async () => {
      try {
        const r0 = nextRoundResults[0]
        const r1 = nextRoundResults[1]
        const collected = new Set([
          ...getCollectedIdsFromRound(r0),
          ...getCollectedIdsFromRound(r1)
        ])

        const { data, error } = await supabase
          .from('ingredient_assets')
          .select('spoonacular_ingredient_id, name')

        if (!error && data?.length) {
          const rows = data as Array<{ spoonacular_ingredient_id: number; name: string | null }>
          const index = buildIngredientGroupIndex(rows)
          const expandedCollected = new Set(expandIdsByIngredientGroups(Array.from(collected), index))

          const allSpawnable = rows.map((r) => String(r.spoonacular_ingredient_id))
          const notCollected = allSpawnable.filter((id) => !expandedCollected.has(id))

          if (notCollected.length > 0) {
            await setGameAddedNotTodayIds(notCollected)
            const { notTodayIds, setNotToday } = useFoodPreferencesStore.getState()
            const merged = [...new Set([...notTodayIds, ...notCollected])]
            await setNotToday(merged)
          }
        }
      } catch {
        // If "not today" fails, keep gameplay/results functioning with whatever is already in the store.
      }

      const navParams = getResultsForNavigation()
      if (navParams) {
        router.replace({ pathname: '/game/results', params: navParams })
      } else {
        router.replace('/')
      }
    })()
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
      <TouchableOpacity style={styles.backButtonFloating} onPress={handleBackToHome} accessibilityRole="button" accessibilityLabel="Back">
        <ChevronLeft size={24} color="#1e293b" />
      </TouchableOpacity>
      <GameRoundErrorBoundary
        onExit={() => {
          void clearGameAddedNotTodayFromPreferences()
          ;(router.replace as (href: string) => void)('/')
        }}
      >
        <GameComponent
          roundPurpose={roundPurpose as RoundPurpose}
          mealType={mealType as MealType}
          onComplete={handleComplete}
          roundResults={roundResults}
        />
      </GameRoundErrorBoundary>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  backButtonFloating: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 200,
    elevation: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  errorText: { fontSize: 16, color: '#64748b', textAlign: 'center', padding: 24 },
  backBtn: { marginTop: 16, alignSelf: 'center' },
  backBtnText: { fontSize: 16, fontWeight: '600', color: '#22c55e' }
})
