import { useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { UserProfile } from '@/types/social'
import type { NotificationSettings, PrivacySettings } from '@/types/profile-settings'
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_PRIVACY_SETTINGS
} from '@/types/profile-settings'

type ProfileUpdate = Partial<Pick<
  UserProfile,
  'username' | 'avatar_url' | 'bio' | 'theme' | 'accent_color' | 'font_size' | 'reduce_motion' |
  'notification_settings' | 'privacy_settings' | 'dietary_restrictions' | 'favorite_cuisines' |
  'disliked_foods' | 'price_preference' | 'spice_tolerance' | 'portion_preference' |
  'dont_want_today' | 'dont_want_expires'
>>

export function useProfileSettings (authId: string | undefined, currentProfile: UserProfile | null, refreshProfile: () => void) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateProfile = useCallback(async (updates: ProfileUpdate) => {
    if (!authId) {
      setError('Not signed in')
      return { error: 'Not signed in' }
    }
    setError(null)
    setSaving(true)
    try {
      const { error: e } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('auth_id', authId)
      if (e) {
        setError(e.message)
        return { error: e.message }
      }
      refreshProfile()
      return { error: null }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Update failed'
      setError(msg)
      return { error: msg }
    } finally {
      setSaving(false)
    }
  }, [authId, refreshProfile])

  const getNotificationSettings = useCallback((): NotificationSettings => {
    const raw = currentProfile?.notification_settings
    if (raw && typeof raw === 'object') {
      return { ...DEFAULT_NOTIFICATION_SETTINGS, ...raw } as NotificationSettings
    }
    return DEFAULT_NOTIFICATION_SETTINGS
  }, [currentProfile?.notification_settings])

  const getPrivacySettings = useCallback((): PrivacySettings => {
    const raw = currentProfile?.privacy_settings
    if (raw && typeof raw === 'object') {
      return { ...DEFAULT_PRIVACY_SETTINGS, ...raw } as PrivacySettings
    }
    return DEFAULT_PRIVACY_SETTINGS
  }, [currentProfile?.privacy_settings])

  return {
    updateProfile,
    saving,
    error,
    setError,
    getNotificationSettings,
    getPrivacySettings
  }
}
