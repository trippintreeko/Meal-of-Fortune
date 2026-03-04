'use client'

import { useState } from 'react'
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Share } from 'react-native'
import { useRouter } from 'expo-router'
import { useThemeColors } from '@/hooks/useTheme'
import { useSocialAuth } from '@/hooks/useSocialAuth'
import { supabase } from '@/lib/supabase'
import { validateAndSanitize, sanitizeText, MAX_LENGTH } from '@/lib/sanitize-input'

function generateGroupCode (): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = 'GRP-'
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

export default function JoinGroupScreen () {
  const router = useRouter()
  const colors = useThemeColors()
  const { profile, isAuthenticated, loading: authLoading } = useSocialAuth()
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose')
  const [groupName, setGroupName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createGroup = async () => {
    const nameResult = validateAndSanitize(groupName, {
      fieldName: 'Group name',
      maxLength: MAX_LENGTH.groupName,
      allowNewlines: false,
      disallowDangerous: true
    })
    if (!nameResult.sanitized || !profile?.id) return
    if (!nameResult.ok) {
      setError(nameResult.error)
      return
    }
    setLoading(true)
    setError(null)
    const groupCode = generateGroupCode()
    const { data: groupId, error: rpcErr } = await supabase.rpc('create_meal_group', {
      p_name: nameResult.sanitized,
      p_group_code: groupCode
    })
    if (rpcErr) {
      setError(rpcErr.message)
      setLoading(false)
      return
    }
    setLoading(false)
    router.replace('/social/groups')
  }

  const joinByCode = async () => {
    const code = sanitizeText(joinCode, { allowNewlines: false, maxLength: MAX_LENGTH.friendCode }).trim().toUpperCase()
    if (!code) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: rpcErr } = await supabase.rpc('join_group_by_code', { p_code: code })
      if (rpcErr) {
        setError(rpcErr.message)
        setLoading(false)
        return
      }
      router.replace('/social/groups')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to join')
    }
    setLoading(false)
  }

  if (authLoading) return null
  if (!isAuthenticated) {
    router.replace('/social/login')
    return null
  }

  if (mode === 'choose') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.heading, { color: colors.text }]}>Add a group</Text>
        <TouchableOpacity style={[styles.option, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} onPress={() => setMode('create')}>
          <Text style={[styles.optionTitle, { color: colors.text }]}>Create a new group</Text>
          <Text style={[styles.optionDesc, { color: colors.textMuted }]}>Name your group and get a code to share</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.option, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} onPress={() => setMode('join')}>
          <Text style={[styles.optionTitle, { color: colors.text }]}>Join with a code</Text>
          <Text style={[styles.optionDesc, { color: colors.textMuted }]}>Enter a group code from a friend</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.screenTitle, { color: colors.text }]}>{mode === 'create' ? 'Create a new group' : 'Join with a code'}</Text>
      {mode === 'create' ? (
        <>
          <Text style={[styles.label, { color: colors.textMuted }]}>Group name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
            value={groupName}
            onChangeText={setGroupName}
            placeholder="e.g. Roommates"
            placeholderTextColor={colors.placeholder}
          />
          {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }, loading && styles.buttonDisabled]}
            onPress={createGroup}
            disabled={loading || !groupName.trim()}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create group</Text>}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={[styles.label, { color: colors.textMuted }]}>Group code</Text>
          <Text style={[styles.hintJoin, { color: colors.textMuted }]}>
            Use a group code (e.g. GRP-ABC123), not your friend code. Friend codes like TRI-2486 are for adding friends; group codes are for joining a meal group.
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
            value={joinCode}
            onChangeText={(t) => { setJoinCode(t.toUpperCase()); setError(null) }}
            placeholder="GRP-ABC123"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="characters"
          />
          {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }, loading && styles.buttonDisabled]}
            onPress={joinByCode}
            disabled={loading || !joinCode.trim()}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Join group</Text>}
          </TouchableOpacity>
        </>
      )}
      <TouchableOpacity style={styles.back} onPress={() => { setMode('choose'); setError(null) }}>
        <Text style={[styles.backText, { color: colors.textMuted }]}>Back</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingBottom: 40, minHeight: '100%' },
  friendCodeCard: { borderRadius: 12, padding: 16, marginBottom: 24, borderWidth: 1 },
  friendCodeLabel: { fontSize: 12, fontWeight: '600' },
  friendCodeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  friendCodeValue: { fontSize: 20, fontWeight: '700' },
  shareCodeBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  shareCodeBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  heading: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  hint: { fontSize: 14, marginBottom: 16 },
  option: { borderRadius: 12, padding: 20, marginBottom: 12, borderWidth: 1 },
  optionTitle: { fontSize: 17, fontWeight: '600' },
  optionDesc: { fontSize: 14, marginTop: 4 },
  optionTap: { fontSize: 13, marginTop: 8, fontWeight: '600' },
  screenTitle: { fontSize: 18, fontWeight: '700', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  hintJoin: { fontSize: 13, marginBottom: 12 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 16 },
  error: { fontSize: 14, marginBottom: 12 },
  button: { borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  back: { marginTop: 24, alignItems: 'center' },
  backText: { fontSize: 15 }
})
