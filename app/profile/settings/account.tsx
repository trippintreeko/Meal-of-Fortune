'use client'

import { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { ChevronLeft, Mail, Key, ShieldCheck, RefreshCw, Trash2 } from 'lucide-react-native'
import { useThemeColors } from '@/hooks/useTheme'
import { useSocialAuth } from '@/hooks/useSocialAuth'
import SettingsList from '@/components/profile/SettingsList'
import ConfirmationModal from '@/components/profile/ConfirmationModal'
import type { SettingsItem } from '@/components/profile/SettingsItem'
import { supabase } from '@/lib/supabase'

export default function AccountSettingsScreen () {
  const router = useRouter()
  const colors = useThemeColors()
  const { profile, refreshProfile, signOut } = useSocialAuth()
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false)
  const [regenerateConfirmVisible, setRegenerateConfirmVisible] = useState(false)
  const [regeneratingCode, setRegeneratingCode] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleRegenerateFriendCode = async () => {
    setRegenerateConfirmVisible(false)
    setRegeneratingCode(true)
    const { data, error } = await supabase.rpc('regenerate_friend_code')
    setRegeneratingCode(false)
    if (error) {
      Alert.alert('Error', error.message)
      return
    }
    refreshProfile()
    if (data) Alert.alert('Friend code updated', `Your new code: ${data}`, [{ text: 'OK' }])
  }

  const handleDeleteConfirm = async () => {
    setDeleteConfirmVisible(false)
    setDeleting(true)
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) {
      setDeleting(false)
      Alert.alert('Error', 'Not signed in. Please sign in and try again.')
      return
    }
    const { data, error, response } = await supabase.functions.invoke('delete-account', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })
    setDeleting(false)
    if (error) {
      let msg = error.message
      const res = response ?? (error as { context?: Response })?.context
      if (res && typeof res.json === 'function') {
        try {
          const body = await res.json() as { error?: string }
          if (body?.error) msg = body.error
        } catch (_) {
          try {
            if (typeof res.text === 'function') {
              const text = await res.text()
              if (text) msg = text.length > 200 ? `${text.slice(0, 200)}…` : text
            }
          } catch (_) {}
        }
      }
      if (msg === 'Edge Function returned a non-2xx status code') {
        msg = 'Delete failed. Run migration 20250219200000 in Supabase (SQL Editor) and redeploy the delete-account Edge Function, then try again.'
      }
      Alert.alert('Error', msg)
      return
    }
    const errMsg = (data as { error?: string })?.error
    if (errMsg) {
      Alert.alert('Error', errMsg)
      return
    }
    await signOut()
    router.replace('/(tabs)/profile')
  }

  const items: SettingsItem[] = [
    { id: 'email', icon: Mail, title: 'Change email', description: profile?.email ?? '—', type: 'link', onPress: () => router.push('/profile/settings/change-email') },
    { id: 'password', icon: Key, title: 'Change password', type: 'link', onPress: () => router.push('/profile/settings/change-password') },
    { id: '2fa', icon: ShieldCheck, title: 'Two-factor authentication', description: 'Use an authenticator app for extra security', type: 'link', onPress: () => router.push('/profile/settings/two-factor') },
    { id: 'regenerate-code', icon: RefreshCw, title: 'Regenerate friend code', description: regeneratingCode ? 'Updating…' : 'Get a new code (old one will stop working)', type: 'link', onPress: () => setRegenerateConfirmVisible(true) },
    { id: 'delete', icon: Trash2, title: 'Delete account', description: 'Permanently remove your account and data', type: 'link', destructive: true, onPress: () => setDeleteConfirmVisible(true) }
  ]

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>Account</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <SettingsList items={items} themeColors={colors} />
      </ScrollView>
      <ConfirmationModal
        visible={deleteConfirmVisible}
        title="Delete account?"
        message="This will permanently delete your account and all data. This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirmVisible(false)}
      />
      <ConfirmationModal
        visible={regenerateConfirmVisible}
        title="Regenerate friend code?"
        message="Your current friend code will stop working. Friends who haven’t added you yet will need your new code. Continue?"
        confirmLabel="Regenerate"
        cancelLabel="Cancel"
        onConfirm={handleRegenerateFriendCode}
        onCancel={() => setRegenerateConfirmVisible(false)}
      />
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
  scroll: { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 40 }
})
