'use client'

import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Modal } from 'react-native'
import * as Linking from 'expo-linking'
import { useRouter } from 'expo-router'
import { CheckCircle } from 'lucide-react-native'
import { useThemeColors } from '@/hooks/useTheme'
import { supabase } from '@/lib/supabase'

function parseTokensFromUrl (url: string): { access_token: string; refresh_token: string; type: string } | null {
  const hash = url.includes('#') ? url.split('#')[1] : ''
  const query = url.includes('?') ? url.split('?')[1]?.split('#')[0] ?? '' : ''
  const params = new URLSearchParams(hash || query)
  const access_token = params.get('access_token')
  const refresh_token = params.get('refresh_token')
  const type = params.get('type')
  if (access_token && refresh_token && type) {
    return { access_token, refresh_token, type }
  }
  return null
}

export default function AuthCallbackScreen () {
  const router = useRouter()
  const colors = useThemeColors()
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [emailVerified, setEmailVerified] = useState(false)

  useEffect(() => {
    let mounted = true
    let urlSubscription: { remove: () => void } | null = null

    const handleUrl = async (url: string | null) => {
      if (!url || !mounted) return
      const tokens = parseTokensFromUrl(url)
      if (!tokens) {
        if (mounted) {
          setStatus('error')
          setErrorMessage('Invalid or expired link. Request a new password reset.')
        }
        return
      }
      const { error } = await supabase.auth.setSession({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token
      })
      if (!mounted) return
      if (error) {
        setStatus('error')
        setErrorMessage(error.message)
        return
      }
      setStatus('ok')
      if (tokens.type === 'recovery') {
        router.replace('/social/set-new-password')
      } else {
        setEmailVerified(true)
      }
    }

    Linking.getInitialURL().then((url) => {
      if (url) {
        void handleUrl(url)
        return
      }
      urlSubscription = Linking.addEventListener('url', ({ url: u }) => { void handleUrl(u) })
      if (mounted) {
        setStatus('error')
        setErrorMessage('No reset link found. Open the link from your email again.')
      }
    }).catch(() => {
      if (mounted) {
        setStatus('error')
        setErrorMessage('Something went wrong.')
      }
    })

    return () => {
      mounted = false
      urlSubscription?.remove()
    }
  }, [router])

  if (status === 'loading') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Completing sign in…</Text>
      </View>
    )
  }

  if (status === 'error') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>{errorMessage}</Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => router.replace('/social/login')}
        >
          <Text style={styles.buttonText}>Back to Sign in</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const goToSocial = () => {
    setEmailVerified(false)
    router.replace('/social/groups')
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Modal visible={emailVerified} transparent animationType="fade">
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalOverlay}
          onPress={goToSocial}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <CheckCircle size={48} color={colors.primary} style={styles.modalIcon} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Email verified successfully</Text>
            <Text style={[styles.modalBody, { color: colors.textMuted }]}>
              Your email has been confirmed. You can now use your account.
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
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
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
