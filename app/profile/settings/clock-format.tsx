'use client'

import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { useThemeColors } from '@/hooks/useTheme'
import { useClockFormat } from '@/hooks/useClockFormat'

export default function ClockFormatSettingsScreen () {
  const router = useRouter()
  const colors = useThemeColors()
  const { is24Hour, setClockFormat } = useClockFormat()

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Clock format</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Used for picking poll deadline and other time pickers.
        </Text>
        <TouchableOpacity
          style={[styles.optionRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }, !is24Hour && styles.optionRowSelected]}
          onPress={() => setClockFormat(false)}
          activeOpacity={0.7}
        >
          <Text style={[styles.optionLabel, { color: colors.text }]}>12-hour</Text>
          <Text style={[styles.optionHint, { color: colors.textMuted }]}>e.g. 2:30 PM</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.optionRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }, is24Hour && styles.optionRowSelected]}
          onPress={() => setClockFormat(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.optionLabel, { color: colors.text }]}>24-hour</Text>
          <Text style={[styles.optionHint, { color: colors.textMuted }]}>e.g. 14:30</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  backBtn: { marginRight: 12 },
  title: { fontSize: 18, fontWeight: '700', flex: 1 },
  headerSpacer: { width: 36 },
  scroll: { padding: 20, paddingTop: 8 },
  subtitle: { fontSize: 14, marginBottom: 16 },
  optionRow: { borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 12 },
  optionRowSelected: { borderWidth: 2, borderColor: '#22c55e' },
  optionLabel: { fontSize: 16, fontWeight: '600' },
  optionHint: { fontSize: 13, marginTop: 4 },
})
