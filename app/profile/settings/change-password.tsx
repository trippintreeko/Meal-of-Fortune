 'use client'

import { useState, useMemo, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import * as Linking from 'expo-linking'
import { useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { useThemeColors } from '@/hooks/useTheme'
import { supabase } from '@/lib/supabase'
import { useSocialAuth } from '@/hooks/useSocialAuth'

export default function ChangePasswordScreen () {
  const router = useRouter()
  const colors = useThemeColors()
  const { profile } = useSocialAuth()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const email = useMemo(() => profile?.email?.trim() || '', [profile?.email])

  const handleSendResetEmail = useCallback(async () => {
    setError(null)
    if (!email) {
      Alert.alert('Missing email', 'Your email address is required to send a password reset link.')
      return
    }

    setLoading(true)
    const webRedirect =
      (process.env.EXPO_PUBLIC_EMAIL_CONFIRM_REDIRECT_URL as string | undefined)?.trim()
      || (process.env.EXPO_PUBLIC_PASSWORD_RESET_REDIRECT_URL as string | undefined)?.trim()
    const devRedirect = __DEV__ ? 'http://localhost:8081/social/auth-callback' : null
    // For native apps, always use the deep link so Supabase tokens survive the redirect.
    const appRedirect = devRedirect || Linking.createURL('social/auth-callback')
    const redirectTo = Platform.OS === 'web' ? (webRedirect || appRedirect) : appRedirect

    const { error: e } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    setLoading(false)

    if (e) {
      setError(e.message)
      return
    }

    setSent(true)
  }, [email])

  if (!profile) {
    return (
      <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </KeyboardAvoidingView>
    )
  }

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} disabled={loading}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>Change password</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {sent ? (
          <>
            <Text style={[styles.successTitle, { color: colors.text }]}>Check your email</Text>
            <Text style={[styles.successBody, { color: colors.textMuted }]}>
              We sent a password reset link to {email}. Open the link to set your new password.
            </Text>
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={() => router.back()} disabled={loading}>
              {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Back to settings</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              For security, we'll send a reset link to your email. You'll set your new password from that link.
            </Text>
            {error ? <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text> : null}
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleSendResetEmail} disabled={loading}>
              {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Send reset email</Text>}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  hint: { fontSize: 14, marginBottom: 16, textAlign: 'center' },
  errorText: { fontSize: 14, marginBottom: 12, textAlign: 'center' },
  successTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  successBody: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  button: { borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonText: { fontSize: 16, fontWeight: '600', color: '#ffffff' }
})
