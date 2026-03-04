import { create } from 'zustand'
import type { MealType, RoundResult } from '@/types/game-session'
import { ROUND_INDEX_TO_PURPOSE } from '@/types/game-session'
import { pickRandomGameIds, GAMES_PER_SESSION } from '@/lib/game-registry'

type NavParams = {
  base: string
  protein: string
  vegetable: string
  /** Comma-separated cooking method ids from round 3 (e.g. "bake,grill") */
  method: string
  seasonings: string
  garnishes: string
  halfBases: string
  halfProteins: string
  halfVegetables: string
}

type GameSessionState = {
  mealType: MealType | null
  feeling: string | null
  gameIds: string[]
  roundResults: (RoundResult | null)[]
  /** Food IDs added to "don't want today" by this game run (round 3); cleared when leaving results so the list resets. */
  gameAddedNotTodayIds: string[]
  startSession: (mealType: MealType) => void
  setFeeling: (feeling: string | null) => void
  setRoundResult: (roundIndex: number, result: RoundResult) => void
  setGameAddedNotTodayIds: (ids: string[]) => void
  getResultsForNavigation: () => NavParams | null
  reset: () => void
}

const TOTAL_ROUNDS = GAMES_PER_SESSION

export const useGameSessionStore = create<GameSessionState>((set, get) => ({
  mealType: null,
  feeling: null,
  gameIds: [],
  roundResults: [null, null, null],
  gameAddedNotTodayIds: [],

  startSession (mealType: MealType) {
    const gameIds = pickRandomGameIds(TOTAL_ROUNDS)
    set({
      mealType,
      feeling: null,
      gameIds,
      roundResults: [null, null, null],
      gameAddedNotTodayIds: []
    })
  },

  setFeeling (feeling: string | null) {
    set({ feeling })
  },

  setRoundResult (roundIndex: number, result: RoundResult) {
    const { roundResults } = get()
    const next = [...roundResults]
    next[roundIndex] = result
    set({ roundResults: next })
  },

  setGameAddedNotTodayIds (ids: string[]) {
    set({ gameAddedNotTodayIds: ids })
  },

  getResultsForNavigation () {
    const { roundResults } = get()
    const r0 = roundResults[0]
    const r1 = roundResults[1]
    const getR0 = () => {
      if (r0?.purpose === 'all_ingredients') return { baseIds: r0.baseIds ?? [], proteinIds: r0.proteinIds ?? [], vegetableIds: r0.vegetableIds ?? [], seasoningIds: r0.seasoningIds ?? [], garnishIds: r0.garnishIds ?? [] }
      if (r0?.purpose === 'base') return { baseIds: r0.baseIds ?? [], proteinIds: [] as string[], vegetableIds: [] as string[], seasoningIds: [] as string[], garnishIds: [] as string[] }
      return { baseIds: [] as string[], proteinIds: [] as string[], vegetableIds: [] as string[], seasoningIds: [] as string[], garnishIds: [] as string[] }
    }
    const getR1 = () => {
      if (r1?.purpose === 'all_ingredients') return { baseIds: r1.baseIds ?? [], proteinIds: r1.proteinIds ?? [], vegetableIds: r1.vegetableIds ?? [], seasoningIds: r1.seasoningIds ?? [], garnishIds: r1.garnishIds ?? [] }
      if (r1?.purpose === 'protein_vegetable') return { baseIds: [] as string[], proteinIds: r1.proteinIds ?? [], vegetableIds: r1.vegetableIds ?? [], seasoningIds: [] as string[], garnishIds: [] as string[] }
      return { baseIds: [] as string[], proteinIds: [] as string[], vegetableIds: [] as string[], seasoningIds: [] as string[], garnishIds: [] as string[] }
    }
    const a = getR0()
    const b = getR1()
    const set0 = (ids: string[]) => new Set(ids)
    const inBoth = (s0: Set<string>, s1: Set<string>) => [...s0].filter(id => s1.has(id))
    const inOneOnly = (s0: Set<string>, s1: Set<string>) => [...new Set([...s0, ...s1])].filter(id => !(s0.has(id) && s1.has(id)))
    const baseHigh = inBoth(set0(a.baseIds), set0(b.baseIds))
    const baseLow = inOneOnly(set0(a.baseIds), set0(b.baseIds))
    const proteinHigh = inBoth(set0(a.proteinIds), set0(b.proteinIds))
    const proteinLow = inOneOnly(set0(a.proteinIds), set0(b.proteinIds))
    const vegHigh = inBoth(set0(a.vegetableIds), set0(b.vegetableIds))
    const vegLow = inOneOnly(set0(a.vegetableIds), set0(b.vegetableIds))
    const allBases = [...new Set([...a.baseIds, ...b.baseIds])]
    const allProteins = [...new Set([...a.proteinIds, ...b.proteinIds])]
    const allVegetables = [...new Set([...a.vegetableIds, ...b.vegetableIds])]
    const allSeasonings = [...new Set([...(a.seasoningIds ?? []), ...(b.seasoningIds ?? [])])]
    const allGarnishes = [...new Set([...(a.garnishIds ?? []), ...(b.garnishIds ?? [])])]
    const r2 = roundResults[2]
    const methodList = r2?.purpose === 'cooking_method' && 'methods' in r2 && Array.isArray(r2.methods) && r2.methods.length > 0
      ? r2.methods
      : (r2?.purpose === 'cooking_method' && 'method' in r2 && r2.method ? [r2.method] : ['grill'])
    const method = methodList.join(',')
    if (allBases.length === 0 || allProteins.length === 0 || allVegetables.length === 0) return null
    return {
      base: allBases.join(','),
      protein: allProteins.join(','),
      vegetable: allVegetables.join(','),
      method,
      seasonings: allSeasonings.join(','),
      garnishes: allGarnishes.join(','),
      halfBases: baseLow.join(','),
      halfProteins: proteinLow.join(','),
      halfVegetables: vegLow.join(',')
    }
  },

  reset () {
    set({ mealType: null, feeling: null, gameIds: [], roundResults: [null, null, null], gameAddedNotTodayIds: [] })
  }
}))

export { ROUND_INDEX_TO_PURPOSE, TOTAL_ROUNDS }
