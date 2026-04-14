import { useCallback, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type HelpfulHintsMode = 'off' | 'icons'

const HELPFUL_HINTS_KEY = '@helpful_hints_mode'

function coerceMode (v: unknown): HelpfulHintsMode {
  if (v === 'off' || v === 'icons') return v
  // Back-compat: previously we had a 'full' mode.
  if (v === 'full') return 'icons'
  return 'off'
}

/** One shared value for the whole app so Settings and Calendar stay in sync. */
let sharedMode: HelpfulHintsMode = 'off'
let sharedHydrated = false
let loadStarted = false
const listeners = new Set<() => void>()

function notifyListeners () {
  for (const l of listeners) l()
}

function startLoadFromStorageIfNeeded () {
  if (loadStarted) return
  loadStarted = true
  AsyncStorage.getItem(HELPFUL_HINTS_KEY)
    .then((v) => {
      sharedMode = coerceMode(v)
      sharedHydrated = true
      notifyListeners()
    })
    .catch(() => {
      sharedHydrated = true
      notifyListeners()
    })
}

export function useHelpfulHints (): {
  mode: HelpfulHintsMode
  setMode: (next: HelpfulHintsMode) => Promise<void>
  isOff: boolean
  isHydrated: boolean
} {
  const [, bump] = useState(0)

  useEffect(() => {
    const sub = () => { bump((n) => n + 1) }
    listeners.add(sub)
    startLoadFromStorageIfNeeded()
    return () => { listeners.delete(sub) }
  }, [])

  const setMode = useCallback(async (next: HelpfulHintsMode) => {
    sharedMode = next
    sharedHydrated = true
    notifyListeners()
    await AsyncStorage.setItem(HELPFUL_HINTS_KEY, next)
  }, [])

  return {
    mode: sharedMode,
    setMode,
    isOff: sharedMode === 'off',
    isHydrated: sharedHydrated
  }
}
