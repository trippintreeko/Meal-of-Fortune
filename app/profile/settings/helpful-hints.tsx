'use client'

import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { ChevronLeft, HelpCircle, Check } from 'lucide-react-native'
import { useThemeColors } from '@/hooks/useTheme'
import { useHelpfulHints, type HelpfulHintsMode } from '@/hooks/useHelpfulHints'

const OPTIONS: { id: HelpfulHintsMode; title: string; hint: string }[] = [
  { id: 'off', title: 'Off', hint: 'Hide on-screen instructions in Calendar and Food Preferences.' },
  { id: 'icons', title: 'On (icons)', hint: 'Show a ? icon; tap to read instructions.' }
]

export default function HelpfulHintsSettingsScreen () {
  const router = useRouter()
  const colors = useThemeColors()
  const { mode, setMode } = useHelpfulHints()

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Helpful hints</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.topCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.topRow}>
            <HelpCircle size={20} color={colors.primary} />
            <Text style={[styles.topTitle, { color: colors.text }]}>How hints work</Text>
          </View>
          <Text style={[styles.topBody, { color: colors.textMuted }]}>
            When on, a ? icon appears on Calendar and Food Preferences; tap it to show instructions. When off, those instructions stay hidden.
          </Text>
        </View>

        {OPTIONS.map((opt) => {
          const selected = mode === opt.id
          return (
            <TouchableOpacity
              key={opt.id}
              style={[
                styles.optionRow,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
                selected && styles.optionRowSelected
              ]}
              onPress={() => { void setMode(opt.id) }}
              activeOpacity={0.7}
            >
              <View style={styles.optionRowTop}>
                <Text style={[styles.optionLabel, { color: colors.text }]}>{opt.title}</Text>
                {selected ? <Check size={16} color={colors.primary} /> : null}
              </View>
              <Text style={[styles.optionHint, { color: colors.textMuted }]}>{opt.hint}</Text>
            </TouchableOpacity>
          )
        })}
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
  topCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6
  },
  topTitle: { fontSize: 16, fontWeight: '700' },
  topBody: { fontSize: 13, lineHeight: 19 },
  optionRow: { borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 12 },
  optionRowSelected: { borderWidth: 2, borderColor: '#22c55e' },
  optionRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  optionLabel: { fontSize: 16, fontWeight: '600' },
  optionHint: { fontSize: 13, marginTop: 4, lineHeight: 18 }
})

