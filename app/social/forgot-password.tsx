'use client'

import { useState, useMemo } from 'react'
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import * as Linking from 'expo-linking'
import { useRouter } from 'expo-router'
import { useThemeColors } from '@/hooks/useTheme'
import { sanitizeText } from '@/lib/sanitize-input'
import { supabase } from '@/lib/supabase'

const isNetworkError = (msg: string | null) =>
  !!msg && /network request failed|failed to fetch|AuthRetryableFetchError/i.test(msg)

export default function ForgotPasswordScreen () {
  const router = useRouter()
  const colors = useThemeColors()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmStep, setConfirmStep] = useState(false)
  const [sent, setSent] = useState(false)

  const errorDisplay = useMemo(() => {
    if (!error) return null
    if (isNetworkError(error)) {
      return 'Can\'t reach the server. Check your internet connection.'
    }
    return error
  }, [error])

  const handleContinue = () => {
    const trimmed = sanitizeText(email, { allowNewlines: false }).trim()
    if (!trimmed) {
      setError('Enter your email address.')
      return
    }
    setError(null)
    setConfirmStep(true)
  }

  const handleConfirmSend = async () => {
    const trimmed = sanitizeText(email, { allowNewlines: false }).trim()
    if (!trimmed) return
    setError(null)
    setLoading(true)
    const webRedirect = (process.env.EXPO_PUBLIC_EMAIL_CONFIRM_REDIRECT_URL as string | undefined)?.trim() ||
      (process.env.EXPO_PUBLIC_PASSWORD_RESET_REDIRECT_URL as string | undefined)?.trim()
    const devRedirect = __DEV__ ? 'http://localhost:8081/social/auth-callback' : null
    // Important: for native apps, the redirect page must preserve Supabase's access/refresh tokens.
    // If a static website redirect is used, those tokens can get dropped, resulting in
    // "Invalid or expired link" when we return to `social/auth-callback`.
    // So on iOS/Android we always use the app deep link.
    const appRedirect = devRedirect || Linking.createURL('social/auth-callback')
    const redirectTo = Platform.OS === 'web' ? (webRedirect || appRedirect) : appRedirect
    const { error: e } = await supabase.auth.resetPasswordForEmail(trimmed, { redirectTo })
    setLoading(false)
    if (e) {
      setError(e.message)
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.successTitle, { color: colors.text }]}>Check your email</Text>
          <Text style={[styles.successBody, { color: colors.textMuted }]}>
            If an account exists for {email.trim()}, you’ll receive a link to reset your password. Check your inbox and spam folder.
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.buttonText}>Back to Sign in</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    )
  }

  if (confirmStep) {
    const trimmed = sanitizeText(email, { allowNewlines: false }).trim()
    return (
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.successTitle, { color: colors.text }]}>Confirm password reset</Text>
          <Text style={[styles.successBody, { color: colors.textMuted }]}>
            We'll send a password reset link to {trimmed}. Do you want to continue?
          </Text>
          {errorDisplay ? <Text style={[styles.error, { color: colors.destructive }]}>{errorDisplay}</Text> : null}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }, loading && styles.buttonDisabled]}
            onPress={handleConfirmSend}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color={colors.primaryText} /> : <Text style={styles.buttonText}>Yes, send the email</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.link}
            onPress={() => { setConfirmStep(false); setError(null) }}
            disabled={loading}
          >
            <Text style={[styles.linkText, { color: colors.primary }]}>Back to edit email</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    )
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Email</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
          value={email}
          onChangeText={(text) => { setEmail(text); setError(null) }}
          placeholder="you@example.com"
          placeholderTextColor={colors.placeholder}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          editable={!loading}
        />
        {errorDisplay ? <Text style={[styles.error, { color: colors.destructive }]}>{errorDisplay}</Text> : null}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={handleContinue}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.link} onPress={() => router.back()}>
          <Text style={[styles.linkText, { color: colors.primary }]}>Back to Sign in</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  form: { borderRadius: 16, padding: 24, borderWidth: 1 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 16 },
  error: { fontSize: 14, marginBottom: 12, flexShrink: 1 },
  button: { borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  link: { marginTop: 20, alignItems: 'center' },
  linkText: { fontSize: 15, fontWeight: '600' },
  successTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  successBody: { fontSize: 15, lineHeight: 22, marginBottom: 24, textAlign: 'center' }
})
