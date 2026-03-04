'use client'

import { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { useThemeColors } from '@/hooks/useTheme'
import { supabase } from '@/lib/supabase'

type Factor = { id: string; friendly_name?: string; factor_type: string; status: string }

export default function TwoFactorScreen () {
  const router = useRouter()
  const colors = useThemeColors()
  const [factors, setFactors] = useState<Factor[]>([])
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [enrollSecret, setEnrollSecret] = useState<string | null>(null)
  const [enrollFactorId, setEnrollFactorId] = useState<string | null>(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [disabling, setDisabling] = useState<string | null>(null)

  const loadFactors = useCallback(async () => {
    const { data, error } = await supabase.auth.mfa.listFactors()
    if (error) {
      setFactors([])
      setLoading(false)
      return
    }
    const all = (data?.totp ?? []) as Factor[]
    setFactors(all)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadFactors()
  }, [loadFactors])

  const handleEnrollStart = async () => {
    setEnrolling(true)
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Meal Vote'
    })
    setEnrolling(false)
    if (error) {
      if (error.message?.includes('mfa_totp_enroll_not_enabled') || error.message?.includes('not enabled')) {
        Alert.alert('Not available', 'Two-factor authentication is not enabled for this app. Contact support.')
      } else {
        Alert.alert('Error', error.message)
      }
      return
    }
    const factorId = (data as { id?: string })?.id
    const secret = (data as { totp?: { secret?: string } })?.totp?.secret
    if (factorId && secret) {
      setEnrollFactorId(factorId)
      setEnrollSecret(secret)
      setVerifyCode('')
    } else {
      Alert.alert('Error', 'Could not start setup.')
    }
  }

  const handleEnrollVerify = async () => {
    const code = verifyCode.trim().replace(/\s/g, '')
    if (!code || !enrollFactorId) return
    if (code.length < 6) {
      Alert.alert('Invalid code', 'Enter the 6-digit code from your authenticator app.')
      return
    }
    setEnrolling(true)
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrollFactorId,
      code
    })
    setEnrolling(false)
    if (error) {
      Alert.alert('Verification failed', error.message)
      return
    }
    setEnrollSecret(null)
    setEnrollFactorId(null)
    setVerifyCode('')
    loadFactors()
    Alert.alert('Two-factor enabled', 'Your account is now protected with an authenticator app.')
  }

  const handleEnrollCancel = () => {
    setEnrollSecret(null)
    setEnrollFactorId(null)
    setVerifyCode('')
  }

  const handleUnenroll = (factorId: string) => {
    Alert.alert(
      'Disable two-factor?',
      'You will no longer need an authenticator code to sign in.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: async () => {
            setDisabling(factorId)
            const { error } = await supabase.auth.mfa.unenroll({ factorId })
            setDisabling(null)
            if (error) {
              Alert.alert('Error', error.message)
              return
            }
            loadFactors()
            Alert.alert('Two-factor disabled', 'You can turn it back on anytime.')
          }
        }
      ]
    )
  }

  const verifiedTotp = factors.filter((f) => f.status === 'verified')

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} disabled={enrolling}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>Two-factor authentication</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
        ) : enrollSecret ? (
          <>
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              Add this app to your authenticator (Google Authenticator, Authy, etc.) using the secret below, then enter the 6-digit code to finish.
            </Text>
            <View style={[styles.secretBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.secretText, { color: colors.text }]} selectable>{enrollSecret}</Text>
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.text }]}
              placeholder="000000"
              placeholderTextColor={colors.textMuted}
              value={verifyCode}
              onChangeText={setVerifyCode}
              keyboardType="number-pad"
              maxLength={8}
              editable={!enrolling}
            />
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleEnrollVerify} disabled={enrolling || verifyCode.trim().length < 6}>
              {enrolling ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Verify and enable</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.linkBtn, { marginTop: 12 }]} onPress={handleEnrollCancel} disabled={enrolling}>
              <Text style={[styles.linkText, { color: colors.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              {verifiedTotp.length > 0
                ? 'An authenticator app is linked. You can disable it below.'
                : 'Use an authenticator app (e.g. Google Authenticator) to add a second step when signing in.'}
            </Text>
            {verifiedTotp.length > 0 ? (
              verifiedTotp.map((f) => (
                <View key={f.id} style={[styles.factorRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <Text style={[styles.factorName, { color: colors.text }]}>{f.friendly_name ?? 'Authenticator'}</Text>
                  <TouchableOpacity
                    style={[styles.disableBtn, { borderColor: colors.cardBorder }]}
                    onPress={() => handleUnenroll(f.id)}
                    disabled={disabling !== null}
                  >
                    {disabling === f.id ? <ActivityIndicator size="small" color={colors.textMuted} /> : <Text style={[styles.disableBtnText, { color: '#dc2626' }]}>Disable</Text>}
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleEnrollStart} disabled={enrolling}>
                {enrolling ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Enable two-factor</Text>}
              </TouchableOpacity>
            )}
          </>
        )}
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
  hint: { fontSize: 14, lineHeight: 20, marginBottom: 20 },
  loader: { marginVertical: 24 },
  secretBox: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 16 },
  secretText: { fontSize: 14, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 18, marginBottom: 12, letterSpacing: 4 },
  button: { borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonText: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
  linkBtn: { alignItems: 'center' },
  linkText: { fontSize: 15 },
  factorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 8 },
  factorName: { fontSize: 16, fontWeight: '500' },
  disableBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },
  disableBtnText: { fontSize: 14, fontWeight: '600' }
})
