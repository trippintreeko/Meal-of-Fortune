/**
 * Mini-game registry. Rounds are fixed by purpose: 0 = base, 1 = protein_vegetable, 2 = cooking_method.
 * Games are assigned so each round gets a game that supports that purpose (no random shuffle that
 * could put Cooking Sort in round 1 and skip protein/vegetable).
 *
 * To add a new game (DLC):
 * 1. Create components/games/YourGameRound.tsx with the RoundGameProps interface.
 * 2. Add to GAME_REGISTRY and to the right PURPOSE_GAME_IDS list below.
 */

import React from 'react'
import type { RoundPurpose, MealType, RoundResult } from '@/types/game-session'
import RiverNetRound from '@/components/games/RiverNetRound'
import ConveyorBeltRound from '@/components/games/ConveyorBeltRound'
import CookingSortRound from '@/components/games/CookingSortRound'

export type RoundGameProps = {
  roundPurpose: RoundPurpose
  mealType: MealType
  onComplete: (result: RoundResult) => void
  onReroll?: () => void
  /** Previous round results (e.g. for cooking-sort to build deck). Passed by round screen to avoid store import in game components. */
  roundResults?: (RoundResult | null)[]
}

export type GameDefinition = {
  id: string
  name: string
  description?: string
  component: React.ComponentType<RoundGameProps>
}

/** All mini-games in the pool. Add new entries to expand the rotation. */
export const GAME_REGISTRY: GameDefinition[] = [
  {
    id: 'river-net',
    name: 'River net',
    description: 'Catch food floating down the river in 60 seconds',
    component: RiverNetRound
  },
  {
    id: 'conveyor-belt',
    name: 'Conveyor belt',
    description: 'Drag food to trash, fridge, or plate in 45 seconds',
    component: ConveyorBeltRound
  },
  {
    id: 'cooking-sort',
    name: 'Cooking sort',
    description: 'Sort ingredients by how to prepare in 30 seconds',
    component: CookingSortRound
  }
]

export const GAMES_PER_SESSION = 2

/** Game IDs that can play the ingredient-collection rounds */
const BASE_AND_PROTEIN_VEG_GAME_IDS = ['river-net', 'conveyor-belt']

/**
 * Shuffle array in place (Fisher–Yates) and return it.
 */
function shuffle<T> (arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Assign games per round for ingredient-collection rounds.
 * Round 0 and 1 each get a different game from river-net/conveyor-belt (no repeat).
 */
export function pickRandomGameIds (count: number = GAMES_PER_SESSION): string[] {
  const baseAndProteinVeg = shuffle([...BASE_AND_PROTEIN_VEG_GAME_IDS])
  return baseAndProteinVeg.slice(0, Math.min(count, GAMES_PER_SESSION))
}

export function getGameById (id: string): GameDefinition | undefined {
  return GAME_REGISTRY.find(g => g.id === id)
}

export function getGameIds (): string[] {
  return GAME_REGISTRY.map(g => g.id)
}
