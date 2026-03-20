import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import type { CalendarEvent, SavedMeal, MealSlot } from '@/types/calendar'
import { dateKey } from '@/types/calendar'

const CALENDAR_EVENTS_KEY = '@meal_calendar_events'
const SAVED_MEALS_KEY = '@meal_saved_meals'

type CalendarState = {
  events: CalendarEvent[]
  savedMeals: SavedMeal[]
  /** When set, spin screen uses only these meal IDs; when null, spin uses all savedMeals */
  spinMealIds: string[] | null
  /** Meals for Surprise Me spin (from food gallery); cleared when leaving surprise-spin screen */
  surpriseSpinMeals: SavedMeal[] | null
  hydrated: boolean
  setSpinMealIds: (ids: string[] | null) => void
  setSurpriseSpinMeals: (meals: SavedMeal[] | null) => void
  load: () => Promise<void>
  saveEvents: (events: CalendarEvent[]) => Promise<void>
  saveSavedMeals: (meals: SavedMeal[]) => Promise<void>
  addEvent: (event: Omit<CalendarEvent, 'id'>) => Promise<CalendarEvent>
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => Promise<void>
  deleteEvent: (id: string) => Promise<void>
  moveEvent: (id: string, newDate: string, newSlot?: MealSlot) => Promise<void>
  copyEvent: (id: string, toDate: string, toSlot?: MealSlot) => Promise<CalendarEvent>
  getEventsForDate: (date: string) => CalendarEvent[]
  getVotedMeals: (sessionId: string) => CalendarEvent[]
  addVotedMeal: (event: Omit<CalendarEvent, 'id'>, votingMetadata: {
    votingSessionId: string
    originalSuggestionId: string
    isWinner: boolean
    voteCount?: number
    totalVoters?: number
    suggestedBy?: string
    scheduledByAdmin?: boolean
    isSuggestedEvent?: boolean
    scheduledGroupMealId?: string
  }) => Promise<CalendarEvent>
  addSavedMeal: (meal: Omit<SavedMeal, 'id' | 'createdAt'>) => Promise<SavedMeal>
  removeSavedMeal: (id: string) => Promise<void>
  getSavedMeal: (id: string) => SavedMeal | undefined
}

function generateId (): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  events: [],
  savedMeals: [],
  spinMealIds: null,
  surpriseSpinMeals: null,
  hydrated: false,

  setSpinMealIds (ids: string[] | null) {
    set({ spinMealIds: ids })
  },

  setSurpriseSpinMeals (meals: SavedMeal[] | null) {
    set({ surpriseSpinMeals: meals })
  },

  async load () {
    try {
      const [eventsJson, mealsJson] = await Promise.all([
        AsyncStorage.getItem(CALENDAR_EVENTS_KEY),
        AsyncStorage.getItem(SAVED_MEALS_KEY)
      ])
      set({
        events: eventsJson ? JSON.parse(eventsJson) : [],
        savedMeals: mealsJson ? JSON.parse(mealsJson) : [],
        hydrated: true
      })
    } catch (e) {
      set({ events: [], savedMeals: [], hydrated: true })
    }
  },

  async saveEvents (events: CalendarEvent[]) {
    set({ events })
    await AsyncStorage.setItem(CALENDAR_EVENTS_KEY, JSON.stringify(events))
  },

  async saveSavedMeals (meals: SavedMeal[]) {
    set({ savedMeals: meals })
    await AsyncStorage.setItem(SAVED_MEALS_KEY, JSON.stringify(meals))
  },

  async addEvent (event: Omit<CalendarEvent, 'id'>) {
    const newEvent: CalendarEvent = { ...event, id: generateId() }
    const events = [...get().events, newEvent]
    await get().saveEvents(events)
    return newEvent
  },

  async updateEvent (id: string, updates: Partial<CalendarEvent>) {
    const events = get().events.map(e => (e.id === id ? { ...e, ...updates } : e))
    await get().saveEvents(events)
  },

  async deleteEvent (id: string) {
    const events = get().events.filter(e => e.id !== id)
    await get().saveEvents(events)
  },

  async moveEvent (id: string, newDate: string, newSlot?: MealSlot) {
    const events = get().events.map(e => {
      if (e.id !== id) return e
      return { ...e, date: newDate, ...(newSlot != null ? { mealSlot: newSlot } : {}) }
    })
    await get().saveEvents(events)
  },

  async copyEvent (id: string, toDate: string, toSlot?: MealSlot) {
    const event = get().events.find(e => e.id === id)
    if (!event) throw new Error('Event not found')
    const copy: Omit<CalendarEvent, 'id'> = {
      date: toDate,
      mealSlot: toSlot ?? event.mealSlot,
      savedMealId: event.savedMealId,
      title: event.title,
      baseId: event.baseId,
      proteinId: event.proteinId,
      vegetableId: event.vegetableId,
      method: event.method,
      reminderAt: null,
      notificationId: null,
      votingSessionId: event.votingSessionId,
      voteWinnerId: event.voteWinnerId,
      voteCount: event.voteCount,
      totalVoters: event.totalVoters,
      suggestedBy: event.suggestedBy,
      isVotedMeal: event.isVotedMeal,
      originalSuggestionId: event.originalSuggestionId,
      isWinner: event.isWinner,
      scheduledByAdmin: event.scheduledByAdmin,
      isSuggestedEvent: event.isSuggestedEvent,
      scheduledGroupMealId: event.scheduledGroupMealId
    }
    return get().addEvent(copy)
  },

  getEventsForDate (date: string) {
    const order: MealSlot[] = ['breakfast', 'lunch', 'dinner']
    return get().events
      .filter(e => e.date === date)
      .sort((a, b) => order.indexOf(a.mealSlot) - order.indexOf(b.mealSlot))
  },

  getVotedMeals (sessionId: string) {
    return get().events.filter(e => e.votingSessionId === sessionId)
  },

  async addVotedMeal (
    event: Omit<CalendarEvent, 'id'>,
    votingMetadata: {
      votingSessionId: string
      originalSuggestionId: string
      isWinner: boolean
      voteCount?: number
      totalVoters?: number
      suggestedBy?: string
      scheduledByAdmin?: boolean
      isSuggestedEvent?: boolean
      scheduledGroupMealId?: string
    }
  ) {
    return get().addEvent({
      ...event,
      votingSessionId: votingMetadata.votingSessionId,
      voteWinnerId: votingMetadata.originalSuggestionId,
      originalSuggestionId: votingMetadata.originalSuggestionId,
      isVotedMeal: true,
      isWinner: votingMetadata.isWinner,
      voteCount: votingMetadata.voteCount,
      totalVoters: votingMetadata.totalVoters,
      suggestedBy: votingMetadata.suggestedBy,
      scheduledByAdmin: votingMetadata.scheduledByAdmin,
      isSuggestedEvent: votingMetadata.isSuggestedEvent,
      scheduledGroupMealId: votingMetadata.scheduledGroupMealId
    })
  },

  async addSavedMeal (meal: Omit<SavedMeal, 'id' | 'createdAt'>) {
    const galleryId = (meal.galleryMealId ?? '').trim()
    if (galleryId) {
      const existing = get().savedMeals.find(
        (m) => (m.galleryMealId ?? '').trim() === galleryId
      )
      if (existing) return existing
    }
    const newMeal: SavedMeal = {
      ...meal,
      galleryMealId: galleryId || undefined,
      id: generateId(),
      createdAt: Date.now()
    }
    const meals = [...get().savedMeals, newMeal]
    await get().saveSavedMeals(meals)
    return newMeal
  },

  async removeSavedMeal (id: string) {
    const meals = get().savedMeals.filter(m => m.id !== id)
    await get().saveSavedMeals(meals)
  },

  getSavedMeal (id: string) {
    return get().savedMeals.find(m => m.id === id)
  }
}))
