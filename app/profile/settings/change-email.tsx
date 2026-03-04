'use client'

import { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { useThemeColors } from '@/hooks/useTheme'
import { sanitizeText } from '@/lib/sanitize-input'
import { useSocialAuth } from '@/hooks/useSocialAuth'
import { supabase } from '@/lib/supabase'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ChangeEmailScreen () {
  const router = useRouter()
  const colors = useThemeColors()
  const { profile, refreshProfile } = useSocialAuth()
  const [newEmail, setNewEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    const trimmed = sanitizeText(newEmail, { allowNewlines: false }).trim()
    if (!trimmed) {
      Alert.alert('Required', 'Enter your new email address.')
      return
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.')
      return
    }
    if (trimmed.toLowerCase() === profile?.email?.toLowerCase()) {
      Alert.alert('Same email', 'This is already your current email.')
      return
    }
    setLoading(true)
    const { data, error } = await supabase.auth.updateUser({ email: trimmed })
    setLoading(false)
    if (error) {
      if (error.message?.toLowerCase().includes('already') || error.message?.toLowerCase().includes('exists')) {
        Alert.alert('Email in use', 'That email is already registered. Use a different address.')
      } else {
        Alert.alert('Error', error.message)
      }
      return
    }
    refreshProfile()
    Alert.alert(
      'Confirm your new email',
      'We sent a confirmation link to ' + trimmed + '. Open that link to finish changing your email. You may need to sign in again after confirming.',
      [{ text: 'OK', onPress: () => router.back() }]
    )
  }

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} disabled={loading}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>Change email</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={[styles.hint, { color: colors.textMuted }]}>Current: {profile?.email ?? '—'}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.text }]}
          placeholder="New email address"
          placeholderTextColor={colors.textMuted}
          value={newEmail}
          onChangeText={setNewEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Update email</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
  hint: { fontSize: 14, marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 20 },
  button: { borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonText: { fontSize: 16, fontWeight: '600', color: '#ffffff' }
})
