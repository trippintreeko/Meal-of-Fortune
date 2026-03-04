'use client'

import { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Linking, Alert, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { useThemeColors } from '@/hooks/useTheme'
import { submitFeatureRequest } from '@/lib/feedback'
import { featureRequestMailto } from '@/lib/support-email'
import { validateAndSanitize, MAX_LENGTH } from '@/lib/sanitize-input'

export default function FeatureRequestScreen () {
  const router = useRouter()
  const colors = useThemeColors()
  const [description, setDescription] = useState('')
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    const result = validateAndSanitize(description, {
      fieldName: 'Description',
      maxLength: MAX_LENGTH.featureRequest,
      allowNewlines: true,
      disallowDangerous: true
    })
    if (!result.ok) {
      Alert.alert('Invalid', result.error)
      return
    }
    if (!result.sanitized) {
      Alert.alert('Missing details', 'Please describe your idea.')
      return
    }
    const textToSend = result.sanitized
    setSending(true)
    const { error } = await submitFeatureRequest(textToSend)
    setSending(false)
    if (!error) {
      Alert.alert('Thank you', 'Your feature request has been sent.', [{ text: 'OK', onPress: () => router.back() }])
      return
    }
    const tryEmail = () => {
      const url = featureRequestMailto(textToSend)
      Linking.canOpenURL(url).then((ok) => { if (ok) Linking.openURL(url) })
    }
    Alert.alert(
      'Send via email instead?',
      'We couldn’t save your request right now. You can send it by email instead.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open email', onPress: tryEmail }
      ]
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} disabled={sending}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>Feature request</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Tell us what you'd like to see. Your idea is saved so we can consider it.
        </Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.text }]}
          placeholder="Describe your idea..."
          placeholderTextColor={colors.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          editable={!sending}
        />
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={handleSend}
          disabled={sending}
        >
          {sending ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Send request</Text>}
        </TouchableOpacity>
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
  hint: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    minHeight: 120,
    marginBottom: 20
  },
  button: { borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonText: { fontSize: 16, fontWeight: '600', color: '#ffffff' }
})
