import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'

export type PreferenceKind = 'favorite' | 'dislike' | 'never_today'

const PREFERENCES_KEY = '@meal_food_preferences'

type PersistedPreferences = {
  favoriteIds: string[]
  dislikeIds: string[]
  notTodayIds: string[]
  appliedDietIds: Record<PreferenceKind, string[]>
}

const defaultPersisted: PersistedPreferences = {
  favoriteIds: [],
  dislikeIds: [],
  notTodayIds: [],
  appliedDietIds: {
    favorite: [],
    dislike: [],
    never_today: []
  }
}

type FoodPreferencesState = PersistedPreferences & {
  hydrated: boolean
  load: () => Promise<void>
  setFavorites: (ids: string[]) => Promise<void>
  setDislikes: (ids: string[]) => Promise<void>
  setNotToday: (ids: string[]) => Promise<void>
  setAppliedDietIds: (tab: PreferenceKind, dietIds: string[]) => Promise<void>
  updateLists: (updates: Partial<Pick<PersistedPreferences, 'favoriteIds' | 'dislikeIds' | 'notTodayIds'>>) => Promise<void>
  getFoodStatus: (foodId: string) => PreferenceKind | null
  isDisliked: (foodId: string) => boolean
  isNotToday: (foodId: string) => boolean
  isFavorite: (foodId: string) => boolean
}

async function loadStored (): Promise<PersistedPreferences> {
  try {
    const raw = await AsyncStorage.getItem(PREFERENCES_KEY)
    if (!raw) return defaultPersisted
    const parsed = JSON.parse(raw) as Partial<PersistedPreferences>
    return {
      favoriteIds: Array.isArray(parsed.favoriteIds) ? parsed.favoriteIds : defaultPersisted.favoriteIds,
      dislikeIds: Array.isArray(parsed.dislikeIds) ? parsed.dislikeIds : defaultPersisted.dislikeIds,
      notTodayIds: Array.isArray(parsed.notTodayIds) ? parsed.notTodayIds : defaultPersisted.notTodayIds,
      appliedDietIds: parsed.appliedDietIds && typeof parsed.appliedDietIds === 'object'
        ? {
            favorite: Array.isArray(parsed.appliedDietIds.favorite) ? parsed.appliedDietIds.favorite : [],
            dislike: Array.isArray(parsed.appliedDietIds.dislike) ? parsed.appliedDietIds.dislike : [],
            never_today: Array.isArray(parsed.appliedDietIds.never_today) ? parsed.appliedDietIds.never_today : []
          }
        : defaultPersisted.appliedDietIds
    }
  } catch {
    return defaultPersisted
  }
}

async function saveStored (prefs: PersistedPreferences): Promise<void> {
  await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs))
}

export const useFoodPreferencesStore = create<FoodPreferencesState>((set, get) => ({
  ...defaultPersisted,
  hydrated: false,

  async load () {
    const prefs = await loadStored()
    set({ ...prefs, hydrated: true })
  },

  async setFavorites (ids: string[]) {
    const next = { ...get(), favoriteIds: ids }
    set({ favoriteIds: ids })
    await saveStored(next)
  },

  async setDislikes (ids: string[]) {
    const next = { ...get(), dislikeIds: ids }
    set({ dislikeIds: ids })
    await saveStored(next)
  },

  async setNotToday (ids: string[]) {
    const next = { ...get(), notTodayIds: ids }
    set({ notTodayIds: ids })
    await saveStored(next)
  },

  async setAppliedDietIds (tab: PreferenceKind, dietIds: string[]) {
    const next = {
      ...get(),
      appliedDietIds: { ...get().appliedDietIds, [tab]: dietIds }
    }
    set({ appliedDietIds: next.appliedDietIds })
    await saveStored(next)
  },

  async updateLists (updates: Partial<Pick<PersistedPreferences, 'favoriteIds' | 'dislikeIds' | 'notTodayIds'>>) {
    const next = { ...get(), ...updates }
    set(next)
    await saveStored(next)
  },

  getFoodStatus (foodId: string): PreferenceKind | null {
    const s = get()
    if (s.favoriteIds.includes(foodId)) return 'favorite'
    if (s.dislikeIds.includes(foodId)) return 'dislike'
    if (s.notTodayIds.includes(foodId)) return 'never_today'
    return null
  },

  isDisliked (foodId: string) {
    return get().dislikeIds.includes(foodId)
  },

  isNotToday (foodId: string) {
    return get().notTodayIds.includes(foodId)
  },

  isFavorite (foodId: string) {
    return get().favoriteIds.includes(foodId)
  }
}))
