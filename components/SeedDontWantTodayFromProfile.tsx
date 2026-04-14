'use client'

import { useEffect, useRef } from 'react'
import { useSocialAuth } from '@/hooks/useSocialAuth'
import { sanitizeNotTodayIds, useFoodPreferencesStore } from '@/store/food-preferences-store'

/**
 * One-time per signed-in user: if local Not Today is empty but the profile has entries,
 * copy sanitized ids from the server (new device). Does not re-run after the user clears
 * the list (avoids stale profile overwriting an intentional clear).
 */
export default function SeedDontWantTodayFromProfile () {
  const { profile } = useSocialAuth()
  const hydrated = useFoodPreferencesStore((s) => s.hydrated)
  const load = useFoodPreferencesStore((s) => s.load)
  const setNotToday = useFoodPreferencesStore((s) => s.setNotToday)
  const seedDoneForAuthRef = useRef<string | null>(null)

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const aid = profile?.auth_id
    if (!aid) {
      seedDoneForAuthRef.current = null
      return
    }
    if (!hydrated) return
    if (seedDoneForAuthRef.current === aid) return

    const local = useFoodPreferencesStore.getState().notTodayIds
    if (local.length > 0) {
      seedDoneForAuthRef.current = aid
      return
    }

    const fromProfile = profile?.dont_want_today
    if (!Array.isArray(fromProfile) || fromProfile.length === 0) {
      seedDoneForAuthRef.current = aid
      return
    }

    const clean = sanitizeNotTodayIds(fromProfile)
    if (clean.length > 0) {
      void setNotToday(clean)
    }
    seedDoneForAuthRef.current = aid
  }, [hydrated, profile?.auth_id, profile?.dont_want_today, setNotToday])

  return null
}
