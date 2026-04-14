'use client'

import { useState, useMemo } from 'react'
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import Constants from 'expo-constants'
import { useThemeColors } from '@/hooks/useTheme'
import { useSocialAuth } from '@/hooks/useSocialAuth'
import { sanitizeText } from '@/lib/sanitize-input'

const isNetworkError = (msg: string | null) =>
  !!msg && /network request failed|failed to fetch|AuthRetryableFetchError/i.test(msg)

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const supabaseUrl = (Constants.expoConfig?.extra as { supabaseUrl?: string } | undefined)?.supabaseUrl?.trim() ?? ''

export default function LoginScreen () {
  const router = useRouter()
  const colors = useThemeColors()
  const { signIn, error: authError } = useSocialAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const errorDisplay = useMemo(() => {
    if (validationError) return validationError
    if (!authError) return null
    if (isNetworkError(authError)) {
      return 'Can\'t reach the server. Check your internet connection. On a phone, use Wi‑Fi or mobile data and ensure the app is configured with your cloud Supabase URL (not localhost).'
    }
    return authError
  }, [authError, validationError])

  const handleSignIn = async () => {
    const emailTrimmed = sanitizeText(email, { allowNewlines: false }).trim()
    if (!emailTrimmed || !password) return
    if (!EMAIL_REGEX.test(emailTrimmed)) {
      setValidationError('Please enter a valid email address.')
      return
    }
    setValidationError(null)
    setLoading(true)
    const { error } = await signIn(emailTrimmed, password)
    setLoading(false)
    if (!error) router.replace('/')
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
          onChangeText={(t) => { setEmail(t); setValidationError(null) }}
          placeholder="you@example.com"
          placeholderTextColor={colors.placeholder}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <Text style={[styles.label, { color: colors.textMuted }]}>Password</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor={colors.placeholder}
          secureTextEntry
          autoComplete="password"
        />
        {errorDisplay ? <Text style={[styles.error, { color: colors.destructive }]}>{errorDisplay}</Text> : null}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }, loading && styles.buttonDisabled]}
          onPress={handleSignIn}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign in</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.forgotLink} onPress={() => router.push('/social/forgot-password')}>
          <Text style={[styles.linkText, { color: colors.primary }]}>Forgot password?</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.link} onPress={() => router.push('/social/register')}>
          <Text style={[styles.linkText, { color: colors.primary }]}>Don’t have an account? Sign up</Text>
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
  forgotLink: { marginTop: 12, alignItems: 'center' },
  link: { marginTop: 20, alignItems: 'center' },
  linkText: { fontSize: 15, fontWeight: '600' }
})
