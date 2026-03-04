'use client'

import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { useThemeColors } from '@/hooks/useTheme'

export default function PrivacyPolicyScreen () {
  const router = useRouter()
  const colors = useThemeColors()

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>Privacy policy</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.paragraph, { color: colors.textMuted }]}>
          Last updated: {new Date().toLocaleDateString()}
        </Text>
        <Text style={[styles.paragraph, { color: colors.textMuted }]}>
          We collect only what is needed to run the app: account info (e.g. email if you sign in), your meal preferences, and data you add (meals, groups, votes). We use this to provide the service and to improve the product. We do not sell your data. Data may be stored on our servers and processed in accordance with applicable law. You can adjust visibility (e.g. friend code, dietary preferences) in Profile → Settings → Privacy.
        </Text>
        <Text style={[styles.paragraph, { color: colors.textMuted }]}>
          If you have questions or want to request access or deletion of your data, use Report a problem or contact support from Help & Support.
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
