import { create } from 'zustand'
import {
  getPendingMealPhotos,
  addPendingMealPhoto as addPending,
  type PendingMealPhoto
} from '@/lib/meal-photos'

type MealPhotosState = {
  /** saved_meal_id -> image URL (data URL from local storage) */
  photoMap: Record<string, string>
  /** Pending local photos */
  pending: PendingMealPhoto[]
  hydrated: boolean
  load: () => Promise<void>
  getPhotoUrl: (saved_meal_id: string) => string | null
  addPhotoOffline: (saved_meal_id: string, dataUrl: string) => Promise<void>
  removePhoto: (saved_meal_id: string) => void
}

export const useMealPhotosStore = create<MealPhotosState>((set, get) => ({
  photoMap: {},
  pending: [],
  hydrated: false,

  async load () {
    const pending = await getPendingMealPhotos()
    const photoMap: Record<string, string> = {}
    for (const p of pending) {
      photoMap[p.saved_meal_id] = p.data_url
    }
    set({ photoMap, pending, hydrated: true })
  },

  getPhotoUrl (saved_meal_id: string) {
    const { photoMap, pending } = get()
    if (photoMap[saved_meal_id]) return photoMap[saved_meal_id]
    const p = pending.find((x) => x.saved_meal_id === saved_meal_id)
    return p?.data_url ?? null
  },

  async addPhotoOffline (saved_meal_id, dataUrl) {
    await addPending(saved_meal_id, dataUrl)
    const pending = await getPendingMealPhotos()
    set((s) => ({
      pending,
      photoMap: { ...s.photoMap, [saved_meal_id]: dataUrl }
    }))
  },

  removePhoto (saved_meal_id) {
    set((s) => {
      const next = { ...s.photoMap }
      delete next[saved_meal_id]
      return { photoMap: next }
    })
  }
}))
