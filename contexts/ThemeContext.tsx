'use client'

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useColorScheme } from 'react-native'
import { useSocialAuth } from '@/hooks/useSocialAuth'
import { useProfileSettings } from '@/hooks/useProfileSettings'

const THEME_STORAGE_KEY = '@meal_vote_theme'
export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

type ThemeContextValue = {
  themeMode: ThemeMode
  resolvedTheme: ResolvedTheme
  setTheme: (mode: ThemeMode) => Promise<void>
  loaded: boolean
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function resolveTheme (mode: ThemeMode | null, systemScheme: 'light' | 'dark' | null): ResolvedTheme {
  if (mode === 'dark') return 'dark'
  if (mode === 'light') return 'light'
  return systemScheme === 'dark' ? 'dark' : 'light'
}

export function ThemeProvider ({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme()
  const { profile, refreshProfile } = useSocialAuth()
  const { updateProfile } = useProfileSettings(profile?.auth_id ?? undefined, profile, refreshProfile)
  const [themeMode, setThemeMode] = useState<ThemeMode>('system')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((value) => {
      const stored: ThemeMode = (value === 'light' || value === 'dark' || value === 'system') ? value : 'system'
      setThemeMode(stored)
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (!loaded) return
    const profileTheme = profile?.theme as ThemeMode | undefined
    if (profileTheme && (profileTheme === 'light' || profileTheme === 'dark' || profileTheme === 'system') && profileTheme !== themeMode) {
      setThemeMode(profileTheme)
      AsyncStorage.setItem(THEME_STORAGE_KEY, profileTheme).catch(() => {})
    }
  }, [loaded, profile?.theme])

  const setTheme = useCallback(async (mode: ThemeMode) => {
    setThemeMode(mode)
    await AsyncStorage.setItem(THEME_STORAGE_KEY, mode)
    if (profile?.auth_id) {
      await updateProfile({ theme: mode })
    }
  }, [profile?.auth_id, updateProfile])

  const resolvedTheme = resolveTheme(themeMode, systemScheme ?? null)

  const value: ThemeContextValue = {
    themeMode,
    resolvedTheme,
    setTheme,
    loaded
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme (): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
