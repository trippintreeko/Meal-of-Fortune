'use client'

import { useState, useMemo } from 'react'
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Modal } from 'react-native'
import { useRouter } from 'expo-router'
import { Mail, Check } from 'lucide-react-native'
import { useThemeColors } from '@/hooks/useTheme'
import { useSocialAuth } from '@/hooks/useSocialAuth'
import { validateAndSanitize, sanitizeText, MAX_LENGTH } from '@/lib/sanitize-input'

const isNetworkError = (msg: string | null) =>
  !!msg && /network request failed|failed to fetch|AuthRetryableFetchError/i.test(msg)

const isEmailAlreadyInUse = (msg: string | null) =>
  !!msg && /user already registered|already been registered|email.*already|already in use/i.test(msg)

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function RegisterScreen () {
  const router = useRouter()
  const colors = useThemeColors()
  const { signUp, error: authError } = useSocialAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [passwordMismatch, setPasswordMismatch] = useState(false)
  const [showEmailVerificationModal, setShowEmailVerificationModal] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [agreedError, setAgreedError] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const errorDisplay = useMemo(() => {
    if (validationError) return validationError
    if (agreedError) return 'You must agree to the Terms of Service and Privacy Policy to create an account.'
    if (passwordMismatch) return 'Passwords do not match. Please enter the same password in both fields.'
    if (!authError) return null
    if (isEmailAlreadyInUse(authError)) {
      return 'This email is already in use. Sign in or use a different email.'
    }
    if (isNetworkError(authError)) {
      return 'Can\'t reach the server. Check your internet connection and ensure the app is configured with your cloud Supabase URL (not localhost).'
    }
    return authError
  }, [authError, passwordMismatch, agreedError, validationError])

  const handleSignUp = async () => {
    const emailTrimmed = sanitizeText(email, { allowNewlines: false }).trim()
    if (!emailTrimmed || !password || !username.trim()) return
    if (!EMAIL_REGEX.test(emailTrimmed)) {
      setValidationError('Please enter a valid email address.')
      return
    }
    if (!agreedToTerms) {
      setAgreedError(true)
      return
    }
    setAgreedError(false)
    if (password !== confirmPassword) {
      setPasswordMismatch(true)
      return
    }
    setPasswordMismatch(false)
    const usernameResult = validateAndSanitize(username, {
      fieldName: 'Username',
      maxLength: MAX_LENGTH.username,
      allowNewlines: false,
      disallowDangerous: true
    })
    if (!usernameResult.ok) {
      setValidationError(usernameResult.error)
      return
    }
    setValidationError(null)
    setLoading(true)
    const { error } = await signUp(emailTrimmed, password, usernameResult.sanitized)
    setLoading(false)
    if (!error) {
      setRegisteredEmail(emailTrimmed)
      setShowEmailVerificationModal(true)
    }
  }

  const handleCloseEmailVerificationModal = () => {
    setShowEmailVerificationModal(false)
    router.replace('/social/login')
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Username</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
          value={username}
          onChangeText={(t) => { setUsername(t); setValidationError(null) }}
          placeholder="Display name"
          placeholderTextColor={colors.placeholder}
          autoCapitalize="none"
        />
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
          onChangeText={(text) => { setPassword(text); setPasswordMismatch(false) }}
          placeholder="••••••••"
          placeholderTextColor={colors.placeholder}
          secureTextEntry
          autoComplete="new-password"
        />
        <Text style={[styles.label, { color: colors.textMuted }]}>Confirm password</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
          value={confirmPassword}
          onChangeText={(text) => { setConfirmPassword(text); setPasswordMismatch(false) }}
          placeholder="••••••••"
          placeholderTextColor={colors.placeholder}
          secureTextEntry
          autoComplete="new-password"
        />
        <View style={styles.agreementRow}>
          <TouchableOpacity
            style={[
              styles.checkbox,
              { borderColor: agreedToTerms ? colors.primary : colors.textMuted },
              agreedToTerms && [styles.checkboxChecked, { backgroundColor: colors.primary, borderColor: colors.primary }]
            ]}
            onPress={() => { setAgreedToTerms((v: boolean) => !v); setAgreedError(false) }}
            activeOpacity={0.7}
          >
            {agreedToTerms ? <Check size={16} color={colors.primaryText} strokeWidth={3} /> : null}
          </TouchableOpacity>
          <View style={styles.agreementTextWrap}>
            <Text style={[styles.agreementText, { color: colors.textMuted }]}>
              I have read and agree to the{' '}
              <Text style={[styles.agreementLink, { color: colors.primary }]} onPress={() => router.push('/profile/settings/terms')}>Terms of Service</Text>
              {' '}and{' '}
              <Text style={[styles.agreementLink, { color: colors.primary }]} onPress={() => router.push('/profile/settings/privacy-policy')}>Privacy Policy</Text>.
            </Text>
          </View>
        </View>
        {errorDisplay ? <Text style={[styles.error, { color: colors.destructive }]}>{errorDisplay}</Text> : null}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }, (loading || !agreedToTerms) && styles.buttonDisabled]}
          onPress={handleSignUp}
          disabled={loading || !agreedToTerms}
        >
          {loading ? <ActivityIndicator color={colors.primaryText} /> : <Text style={styles.buttonText}>Create account</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.link} onPress={() => router.back()}>
          <Text style={[styles.linkText, { color: colors.primary }]}>Already have an account? Sign in</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showEmailVerificationModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseEmailVerificationModal}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleCloseEmailVerificationModal}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.card }]} onStartShouldSetResponder={() => true}>
            <Mail size={48} color={colors.primary} style={styles.modalIcon} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Check your email</Text>
            <Text style={[styles.modalBody, { color: colors.textMuted }]}>
              We’ve sent a verification link to {registeredEmail || 'your email'}. Click the link to verify your account, then sign in.
            </Text>
            <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.primary }]} onPress={handleCloseEmailVerificationModal}>
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    padding: 24
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1e293b',
    marginBottom: 16
  },
  agreementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 10
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#94a3b8',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center'
  },
  checkboxChecked: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e'
  },
  agreementTextWrap: {
    flex: 1,
    flexShrink: 1
  },
  agreementText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20
  },
  agreementLink: {
    color: '#22c55e',
    fontWeight: '600',
    textDecorationLine: 'underline'
  },
  error: {
    color: '#dc2626',
    fontSize: 14,
    marginBottom: 12
  },
  button: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8
  },
  buttonDisabled: {
    opacity: 0.7
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700'
  },
  link: {
    marginTop: 20,
    alignItems: 'center'
  },
  linkText: {
    color: '#22c55e',
    fontSize: 15,
    fontWeight: '600'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center'
  },
  modalIcon: {
    marginBottom: 16
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center'
  },
  modalBody: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22
  },
  modalButton: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignSelf: 'stretch'
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center'
  }
})
