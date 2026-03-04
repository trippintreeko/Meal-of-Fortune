'use client'

import { useState } from 'react'
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Modal } from 'react-native'
import { useRouter } from 'expo-router'
import { useThemeColors } from '@/hooks/useTheme'
import { supabase } from '@/lib/supabase'
import { CheckCircle } from 'lucide-react-native'

const MIN_PASSWORD_LENGTH = 6

export default function SetNewPasswordScreen () {
  const router = useRouter()
  const colors = useThemeColors()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async () => {
    const p = password.trim()
    const c = confirm.trim()
    setError(null)
    if (!p) {
      setError('Enter a new password.')
      return
    }
    if (p.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    if (p !== c) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    const { error: e } = await supabase.auth.updateUser({ password: p })
    setLoading(false)
    if (e) {
      setError(e.message)
      return
    }
    setSuccess(true)
  }

  const goToSocial = () => {
    setSuccess(false)
    router.replace('/social/groups')
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Text style={[styles.title, { color: colors.text }]}>Set new password</Text>
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Choose a new password (at least {MIN_PASSWORD_LENGTH} characters).
        </Text>
        <Text style={[styles.label, { color: colors.textMuted }]}>New password</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
          placeholder="••••••••"
          placeholderTextColor={colors.placeholder}
          value={password}
          onChangeText={(text) => { setPassword(text); setError(null) }}
          secureTextEntry
          autoCapitalize="none"
          editable={!loading}
        />
        <Text style={[styles.label, { color: colors.textMuted }]}>Confirm new password</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
          placeholder="••••••••"
          placeholderTextColor={colors.placeholder}
          value={confirm}
          onChangeText={(text) => { setConfirm(text); setError(null) }}
          secureTextEntry
          autoCapitalize="none"
          editable={!loading}
        />
        {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color={colors.primaryText} /> : <Text style={styles.buttonText}>Update password</Text>}
        </TouchableOpacity>
      </View>

      <Modal visible={success} transparent animationType="fade">
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalOverlay}
          onPress={goToSocial}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <CheckCircle size={48} color={colors.primary} style={styles.modalIcon} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Password updated</Text>
            <Text style={[styles.modalBody, { color: colors.textMuted }]}>
              Your password was changed successfully. You can now sign in with your new password.
            </Text>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.primary }]}
              onPress={goToSocial}
            >
              <Text style={styles.modalButtonText}>Continue to app</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  form: { borderRadius: 16, padding: 24, borderWidth: 1 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  hint: { fontSize: 14, marginBottom: 16, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 16 },
  error: { fontSize: 14, marginBottom: 12 },
  button: { borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  modalCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center'
  },
  modalIcon: { marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  modalBody: { fontSize: 15, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  modalButton: { borderRadius: 12, paddingVertical: 14, paddingHorizontal: 24 },
  modalButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' }
})
