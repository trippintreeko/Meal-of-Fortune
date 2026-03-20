import { useState, useEffect, useCallback } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

const CLOCK_FORMAT_KEY = '@clock_format_24'

export function useClockFormat (): { is24Hour: boolean; setClockFormat: (use24: boolean) => Promise<void> } {
  const [is24Hour, setIs24Hour] = useState(false)

  useEffect(() => {
    let cancelled = false
    AsyncStorage.getItem(CLOCK_FORMAT_KEY).then((v) => {
      if (!cancelled) setIs24Hour(v === 'true')
    })
    return () => { cancelled = true }
  }, [])

  const setClockFormat = useCallback(async (use24: boolean) => {
    setIs24Hour(use24)
    await AsyncStorage.setItem(CLOCK_FORMAT_KEY, String(use24))
  }, [])

  return { is24Hour, setClockFormat }
}
