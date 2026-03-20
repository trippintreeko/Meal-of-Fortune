import { useState, useEffect, useCallback } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '@/lib/supabase'
import { dateKey } from '@/types/calendar'

const MEAL_OF_THE_DAY_KEY = '@meal_of_the_day'

export type MealOfTheDayItem = {
  id: string
  title: string
  base: string
  protein: string
  vegetable: string
  method: string
  baseGroup?: string
  description?: string
  /** Up to 3 pre-fetched image URLs for instant display */
  imageUrls?: string[]
  /** When set, modal can load Spoonacular recipe image and link to recipe page */
  spoonacular_recipe_id?: number | null
}

type Stored = {
  dateKey: string
  meal: MealOfTheDayItem
}

async function fetchGalleryMeals (): Promise<MealOfTheDayItem[]> {
  const { data, error } = await supabase
    .from('gallery_meals')
    .select('id, title, description, base_id, protein_id, vegetable_id, cooking_method, base_group, image_urls, spoonacular_recipe_id')
    .order('sort_order')
  if (error || !data || data.length === 0) return []
  return (data as {
    id: string
    title: string
    description: string | null
    base_id: string | null
    protein_id: string | null
    vegetable_id: string | null
    cooking_method: string | null
    base_group: string | null
    image_urls: string[] | null
    spoonacular_recipe_id: number | null
  }[]).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    base: row.base_id ?? '',
    protein: row.protein_id ?? '',
    vegetable: row.vegetable_id ?? '',
    method: row.cooking_method ?? 'grilled',
    baseGroup: row.base_group ?? undefined,
    imageUrls: Array.isArray(row.image_urls) ? row.image_urls : undefined,
    spoonacular_recipe_id: row.spoonacular_recipe_id ?? undefined
  }))
}

export function useMealOfTheDay () {
  const [meal, setMeal] = useState<MealOfTheDayItem | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const today = dateKey(new Date())
    try {
      const storedRaw = await AsyncStorage.getItem(MEAL_OF_THE_DAY_KEY)
      const stored: Stored | null = storedRaw ? JSON.parse(storedRaw) : null
      if (stored && stored.dateKey === today && stored.meal) {
        setMeal(stored.meal)
        setLoading(false)
        return
      }
      const list = await fetchGalleryMeals()
      if (list.length === 0) {
        setMeal(null)
        setLoading(false)
        return
      }
      const index = Math.floor(Math.random() * list.length)
      const picked = list[index]
      const toStore: Stored = { dateKey: today, meal: picked }
      await AsyncStorage.setItem(MEAL_OF_THE_DAY_KEY, JSON.stringify(toStore))
      setMeal(picked)
    } catch {
      setMeal(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { meal, loading, refresh }
}
