'use client'

import { useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { ChevronLeft, Shield } from 'lucide-react-native'
import { useThemeColors } from '@/hooks/useTheme'
import { useSocialAuth } from '@/hooks/useSocialAuth'
import { useProfileSettings } from '@/hooks/useProfileSettings'
import SettingsList from '@/components/profile/SettingsList'
import type { SettingsItem } from '@/components/profile/SettingsItem'
import type { ProfileVisibility } from '@/types/profile-settings'

const VISIBILITY_OPTIONS: { id: ProfileVisibility; label: string }[] = [
  { id: 'public', label: 'Public' },
  { id: 'friends', label: 'Friends only' },
  { id: 'private', label: 'Private' }
]

export default function PrivacySettingsScreen () {
  const router = useRouter()
  const colors = useThemeColors()
  const { profile, refreshProfile } = useSocialAuth()
  const { updateProfile, getPrivacySettings } = useProfileSettings(profile?.auth_id ?? undefined, profile, refreshProfile)
  const privacy = getPrivacySettings()

  const updatePrivacy = useCallback((patch: Partial<typeof privacy>) => {
    const next = { ...privacy, ...patch }
    void updateProfile({ privacy_settings: next })
  }, [privacy, updateProfile])

  const ShieldIcon = Shield
  const items: SettingsItem[] = [
    { id: 'show-friend-code', icon: ShieldIcon, title: 'Show friend code in search', type: 'toggle', value: privacy.show_friend_code_in_search, onValueChange: (v) => updatePrivacy({ show_friend_code_in_search: v }) },
    { id: 'show-dietary', icon: ShieldIcon, title: 'Show dietary preferences to friends', type: 'toggle', value: privacy.show_dietary_preferences, onValueChange: (v) => updatePrivacy({ show_dietary_preferences: v }) }
  ]

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>Privacy</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Profile visibility</Text>
        <View style={styles.visibilityRow}>
          {VISIBILITY_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.id}
              style={[
                styles.visibilityChip,
                { borderColor: colors.border, backgroundColor: colors.card },
                privacy.profile_visibility === opt.id && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}
              onPress={() => updatePrivacy({ profile_visibility: opt.id })}
            >
              <Text
                style={[
                  styles.visibilityChipText,
                  { color: colors.textMuted },
                  privacy.profile_visibility === opt.id && { color: '#ffffff' }
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <SettingsList items={items} themeColors={colors} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 16,
    paddingTop: 16
  },
  backBtn: { padding: 4, marginRight: 4 },
  title: { flex: 1, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  headerSpacer: { width: 32 },
  scroll: { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 40 },
  sectionLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  visibilityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  visibilityChip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1 },
  visibilityChipText: { fontSize: 14, fontWeight: '600' }
})
