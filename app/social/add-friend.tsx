'use client'

import { useState } from 'react'
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { UserPlus } from 'lucide-react-native'
import { useThemeColors } from '@/hooks/useTheme'
import { useSocialAuth } from '@/hooks/useSocialAuth'
import { supabase } from '@/lib/supabase'
import { sanitizeText, MAX_LENGTH } from '@/lib/sanitize-input'

export default function AddFriendScreen () {
  const router = useRouter()
  const colors = useThemeColors()
  const { isAuthenticated, loading: authLoading } = useSocialAuth()
  const [friendCode, setFriendCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const sendRequest = async () => {
    const code = sanitizeText(friendCode, { allowNewlines: false, maxLength: MAX_LENGTH.friendCode }).trim().toUpperCase()
    if (!code) return
    setLoading(true)
    setError(null)
    setSuccess(false)
    const { error: rpcErr } = await supabase.rpc('add_friend_by_code', { p_friend_code: code })
    if (rpcErr) {
      setError(rpcErr.message)
      setLoading(false)
      return
    }
    setSuccess(true)
    setFriendCode('')
    setLoading(false)
    router.push('/social/friends/list')
  }

  if (authLoading) return null
  if (!isAuthenticated) {
    router.replace('/social/login')
    return null
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.hint, { color: colors.textMuted }]}>
        Ask your friend for their code (e.g. TRI-2486) and enter it below to send a friend request.
      </Text>
      <TextInput
        style={[
          styles.input,
          { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }
        ]}
        placeholder="Friend code"
        placeholderTextColor={colors.placeholder}
        value={friendCode}
        onChangeText={(t) => { setFriendCode(t); setError(null) }}
        autoCapitalize="characters"
        autoCorrect={false}
        editable={!loading}
      />
      {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
      {success ? <Text style={[styles.success, { color: colors.primary }]}>Friend request sent.</Text> : null}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }, loading && styles.buttonDisabled]}
        onPress={sendRequest}
        disabled={loading || !friendCode.trim()}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <UserPlus size={22} color="#fff" />
            <Text style={styles.buttonText}>Send friend request</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  hint: { fontSize: 14, marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 12
  },
  error: { fontSize: 14, marginBottom: 12 },
  success: { fontSize: 14, marginBottom: 12 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    padding: 16
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' }
})
