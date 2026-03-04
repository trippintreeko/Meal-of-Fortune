'use client'

import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { useSocialAuth } from '@/hooks/useSocialAuth'
import { useProfileSettings } from '@/hooks/useProfileSettings'
import { useThemeColors } from '@/hooks/useTheme'
import { validateAndSanitize, MAX_LENGTH } from '@/lib/sanitize-input'

export default function EditProfileScreen () {
  const router = useRouter()
  const colors = useThemeColors()
  const { profile, refreshProfile } = useSocialAuth()
  const authId = profile?.auth_id ?? undefined
  const { updateProfile, saving } = useProfileSettings(authId, profile, refreshProfile)
  const [username, setUsername] = useState(profile?.username ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')

  useEffect(() => {
    if (profile) {
      setUsername(profile.username ?? '')
      setBio(profile.bio ?? '')
    }
  }, [profile?.username, profile?.bio])

  const handleSave = async () => {
    const usernameResult = validateAndSanitize(username, {
      fieldName: 'Username',
      maxLength: MAX_LENGTH.username,
      allowNewlines: false,
      disallowDangerous: true
    })
    if (!usernameResult.ok) {
      Alert.alert('Invalid', usernameResult.error)
      return
    }
    const u = usernameResult.sanitized
    if (!u) {
      Alert.alert('Invalid', 'Username is required.')
      return
    }
    const bioResult = validateAndSanitize(bio, {
      fieldName: 'Bio',
      maxLength: MAX_LENGTH.bio,
      allowNewlines: true,
      disallowDangerous: true
    })
    if (!bioResult.ok) {
      Alert.alert('Invalid', bioResult.error)
      return
    }
    const { error } = await updateProfile({ username: u, bio: bioResult.sanitized || null })
    if (error) {
      Alert.alert('Update failed', error)
      return
    }
    refreshProfile()
    router.back()
  }

  if (!profile) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.prompt, { color: colors.textMuted }]}>Sign in to edit profile.</Text>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} accessibilityLabel="Back">
        <ChevronLeft size={24} color={colors.text} />
      </TouchableOpacity>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>Edit profile</Text>
        <Text style={[styles.label, { color: colors.textMuted }]}>Username</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          value={username}
          onChangeText={setUsername}
          placeholder="Username"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          editable={!saving}
        />
        <Text style={[styles.label, { color: colors.textMuted }]}>Bio (optional)</Text>
        <TextInput
          style={[styles.input, styles.bioInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          value={bio}
          onChangeText={setBio}
          placeholder="A short bio..."
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={3}
          editable={!saving}
        />

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary }, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}>
          <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: { position: 'absolute', top: 16, left: 16, zIndex: 10 },
  scroll: { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 40 },
  prompt: { fontSize: 16, textAlign: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20
  },
  bioInput: { minHeight: 80, textAlignVertical: 'top' },
  saveBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' }
})
