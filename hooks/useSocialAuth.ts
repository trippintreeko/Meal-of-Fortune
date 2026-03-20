import { useEffect, useState, useCallback } from 'react'
import * as Linking from 'expo-linking'
import { supabase } from '@/lib/supabase'
import type { UserProfile } from '@/types/social'
import type { Session } from '@supabase/supabase-js'

function isInvalidRefreshTokenError (err: unknown): boolean {
  const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : ''
  return /invalid refresh token|refresh token not found/i.test(msg)
}

function getEmailRedirectTo (): string {
  const env = (process.env.EXPO_PUBLIC_EMAIL_CONFIRM_REDIRECT_URL as string | undefined)?.trim()
  if (env) return env
  if (__DEV__) return 'http://localhost:8081/social/auth-callback'
  return Linking.createURL('social/auth-callback')
}

export function useSocialAuth () {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async (authId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_id', authId)
      .single()
    if (error) {
      setProfile(null)
      return
    }
    setProfile(data as UserProfile)
  }, [])

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session: s } }) => {
        setSession(s)
        if (s?.user?.id) void fetchProfile(s.user.id)
        setLoading(false)
      })
      .catch((err) => {
        if (isInvalidRefreshTokenError(err)) {
          void supabase.auth.signOut()
          setSession(null)
          setProfile(null)
        }
        setLoading(false)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (s?.user?.id) void fetchProfile(s.user.id)
      else setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null)
    const { data, error: e } = await supabase.auth.signInWithPassword({ email, password })
    if (e) {
      setError(e.message)
      return { error: e.message }
    }
    if (data.user?.id) await fetchProfile(data.user.id)
    return { error: null }
  }, [fetchProfile])

  const signUp = useCallback(async (email: string, password: string, username: string) => {
    setError(null)
    const emailRedirectTo = getEmailRedirectTo()
    const { data, error: e } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username }, emailRedirectTo }
    })
    if (e) {
      setError(e.message)
      return { error: e.message }
    }
    const identities = data.user?.identities ?? []
    if (identities.length === 0) {
      const msg = 'This email is already in use. Sign in or use a different email.'
      setError(msg)
      return { error: msg }
    }
    if (data.user?.id) await fetchProfile(data.user.id)
    return { error: null }
  }, [fetchProfile])

  const signOut = useCallback(async () => {
    setError(null)
    await supabase.auth.signOut()
    setProfile(null)
  }, [])

  const refreshProfile = useCallback(() => {
    if (session?.user?.id) void fetchProfile(session.user.id)
  }, [session?.user?.id, fetchProfile])

  return {
    session,
    profile,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    isAuthenticated: !!session
  }
}
