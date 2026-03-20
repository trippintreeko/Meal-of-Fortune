/**
 * Meal photos: upload to Supabase Storage when signed in, or queue offline and sync later via Settings.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import * as FileSystem from 'expo-file-system/legacy'
import { supabase } from '@/lib/supabase'

const MEAL_PHOTOS_BUCKET = 'meal-photos'
const PENDING_KEY = '@meal_photos_pending'
const UPLOAD_MODE_KEY = '@meal_photos_upload_mode'

export type MealPhotoUploadMode = 'auto' | 'local_only'

export async function getMealPhotoUploadMode (): Promise<MealPhotoUploadMode> {
  try {
    const v = await AsyncStorage.getItem(UPLOAD_MODE_KEY)
    if (v === 'local_only' || v === 'auto') return v
    return 'local_only'
  } catch {
    return 'local_only'
  }
}

export async function setMealPhotoUploadMode (mode: MealPhotoUploadMode): Promise<void> {
  await AsyncStorage.setItem(UPLOAD_MODE_KEY, mode)
}

export type PendingMealPhoto = {
  saved_meal_id: string
  data_url: string
  created_at: number
}

export async function getPendingMealPhotos (): Promise<PendingMealPhoto[]> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as PendingMealPhoto[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function savePendingMealPhotos (pending: PendingMealPhoto[]): Promise<void> {
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(pending))
}

export async function addPendingMealPhoto (saved_meal_id: string, data_url: string): Promise<void> {
  const list = await getPendingMealPhotos()
  const filtered = list.filter((p) => p.saved_meal_id !== saved_meal_id)
  filtered.push({ saved_meal_id, data_url, created_at: Date.now() })
  await savePendingMealPhotos(filtered)
}

export async function removePendingMealPhoto (saved_meal_id: string): Promise<void> {
  const list = await getPendingMealPhotos()
  await savePendingMealPhotos(list.filter((p) => p.saved_meal_id !== saved_meal_id))
}

/**
 * Upload a meal photo to Storage and insert into meal_photos.
 * Prefer passing a file URI (file:// or content://); avoids data URL on Android where fetch(dataUrl) can fail.
 */
export async function uploadMealPhoto (
  authId: string,
  profileId: string,
  saved_meal_id: string,
  imageUri: string
): Promise<{ url: string | null; error: string | null }> {
  const scheme = imageUri.startsWith('data:') ? 'data' : (imageUri.split(':')[0] ?? '')
  console.warn('[MealPhoto] uploadMealPhoto: start', { scheme, uriLen: imageUri.length, saved_meal_id: saved_meal_id.slice(0, 20) })
  try {
    console.warn('[MealPhoto] uploadMealPhoto: fetch(imageUri)...')
    const response = await fetch(imageUri)
    console.warn('[MealPhoto] uploadMealPhoto: fetch done', response.ok, response.status, response.statusText)
    if (!response.ok) {
      return { url: null, error: `Fetch failed: ${response.status}` }
    }
    console.warn('[MealPhoto] uploadMealPhoto: response.blob()...')
    const blob = await response.blob()
    console.warn('[MealPhoto] uploadMealPhoto: blob', blob.size, blob.type)
    const ext = imageUri.startsWith('data:')
      ? (imageUri.includes('image/png') ? 'png' : 'jpg')
      : (imageUri.split('.').pop()?.toLowerCase() || 'jpg')
    const safeId = saved_meal_id.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 36)
    const storagePath = `${authId}/meal_${safeId}.${ext}`
    console.warn('[MealPhoto] uploadMealPhoto: storage path', storagePath)

    console.warn('[MealPhoto] uploadMealPhoto: supabase.storage.upload...')
    const { error: uploadErr } = await supabase.storage
      .from(MEAL_PHOTOS_BUCKET)
      .upload(storagePath, blob, {
        contentType: blob.type || 'image/jpeg',
        upsert: true
      })

    if (uploadErr) {
      console.warn('[MealPhoto] uploadMealPhoto: storage upload error', uploadErr.message, uploadErr.name)
      return { url: null, error: uploadErr.message }
    }
    console.warn('[MealPhoto] uploadMealPhoto: storage upload ok')

    const { data: urlData } = supabase.storage.from(MEAL_PHOTOS_BUCKET).getPublicUrl(storagePath)
    const publicUrl = urlData.publicUrl

    console.warn('[MealPhoto] uploadMealPhoto: meal_photos.upsert...')
    const { error: insertErr } = await supabase.from('meal_photos').upsert(
      { user_id: profileId, saved_meal_id, storage_path: storagePath },
      { onConflict: 'user_id,saved_meal_id' }
    )

    if (insertErr) {
      console.warn('[MealPhoto] uploadMealPhoto: upsert error', insertErr.message, insertErr.code)
      return { url: publicUrl, error: insertErr.message }
    }
    console.warn('[MealPhoto] uploadMealPhoto: success')
    return { url: publicUrl, error: null }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack : undefined
    console.warn('[MealPhoto] uploadMealPhoto: catch', msg, stack ?? '')
    return { url: null, error: msg }
  }
}

/**
 * Upload a pending photo (data URL from offline queue). Writes to temp file so fetch() works on Android.
 */
export async function uploadPendingMealPhoto (
  authId: string,
  profileId: string,
  pending: PendingMealPhoto
): Promise<{ url: string | null; error: string | null }> {
  console.warn('[MealPhoto] uploadPendingMealPhoto: start', pending.saved_meal_id, 'data_url len=', pending.data_url.length)
  if (!FileSystem.documentDirectory) {
    console.warn('[MealPhoto] uploadPendingMealPhoto: no documentDirectory')
    return { url: null, error: 'No document directory' }
  }
  const match = /^data:(.*?);base64,(.*)$/.exec(pending.data_url)
  const base64 = match?.[2] ?? ''
  const mime = match?.[1] ?? 'image/jpeg'
  const ext = mime.includes('png') ? 'png' : 'jpg'
  const tempPath = `${FileSystem.documentDirectory}meal_sync_${Date.now()}.${ext}`
  console.warn('[MealPhoto] uploadPendingMealPhoto: tempPath', tempPath, 'base64 len=', base64.length)
  try {
    console.warn('[MealPhoto] uploadPendingMealPhoto: writeAsStringAsync...')
    await FileSystem.writeAsStringAsync(tempPath, base64, { encoding: 'base64' })
    console.warn('[MealPhoto] uploadPendingMealPhoto: temp file written, calling uploadMealPhoto')
    const result = await uploadMealPhoto(authId, profileId, pending.saved_meal_id, tempPath)
    await FileSystem.deleteAsync(tempPath, { idempotent: true })
    console.warn('[MealPhoto] uploadPendingMealPhoto: done', result.error ?? 'ok')
    return result
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Upload failed'
    console.warn('[MealPhoto] uploadPendingMealPhoto: catch', msg, err instanceof Error ? err.stack : '')
    await FileSystem.deleteAsync(tempPath, { idempotent: true }).catch(() => {})
    return { url: null, error: msg }
  }
}

/**
 * Fetch all meal photo URLs for the current user from the database.
 */
export async function fetchMealPhotoUrls (profileId: string): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('meal_photos')
    .select('saved_meal_id, storage_path')
    .eq('user_id', profileId)

  if (error || !data) return {}

  const out: Record<string, string> = {}
  for (const row of data as { saved_meal_id: string; storage_path: string }[]) {
    const { data: urlData } = supabase.storage.from(MEAL_PHOTOS_BUCKET).getPublicUrl(row.storage_path)
    out[row.saved_meal_id] = urlData.publicUrl
  }
  return out
}
