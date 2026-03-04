'use client'

import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { useThemeColors } from '@/hooks/useTheme'

export default function TermsScreen () {
  const router = useRouter()
  const colors = useThemeColors()

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>Terms of service</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.paragraph, { color: colors.textMuted }]}>
          Last updated: {new Date().toLocaleDateString()}
        </Text>
        <Text style={[styles.paragraph, { color: colors.textMuted }]}>
          By using this app you agree to use it in a lawful and respectful way. The app is provided "as is". We do not guarantee uninterrupted service. You are responsible for the accuracy of any content you add (e.g. meals, preferences). Do not share content that infringes others' rights or is harmful. We may update these terms; continued use after changes means you accept the new terms.
        </Text>
        <Text style={[styles.paragraph, { color: colors.textMuted }]}>
          For questions about these terms, contact support via Report a problem or Feature request in Help & Support.
        </Text>
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
  paragraph: { fontSize: 15, lineHeight: 22, marginBottom: 16 }
})
