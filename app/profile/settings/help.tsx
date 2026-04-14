'use client'

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native'
import { useRouter } from 'expo-router'
import { ChevronLeft, HelpCircle, AlertCircle, Lightbulb, FileText, Shield, Coffee, BadgeQuestionMark } from 'lucide-react-native'
import Constants from 'expo-constants'
import { useThemeColors } from '@/hooks/useTheme'
import SettingsList from '@/components/profile/SettingsList'
import type { SettingsItem } from '@/components/profile/SettingsItem'

const PRIVACY_POLICY_URL = 'https://sites.google.com/view/mealoffortune-privacy-policy/home?authuser=1'

/** Android Linking requires a scheme (https://); env values like ko-fi.com/name must be normalized. */
function normalizeHttpUrl (raw: string, fallback: string): string {
  const u = raw.trim()
  if (!u) return fallback
  if (/^https?:\/\//i.test(u)) return u
  return `https://${u.replace(/^\/+/, '')}`
}

function getKofiUrl (): string {
  const extra = Constants.expoConfig?.extra as { kofiUrl?: string } | undefined
  const u = (extra?.kofiUrl ?? '').trim()
  return normalizeHttpUrl(u, 'https://ko-fi.com/mealoffortune')
}

export default function HelpSettingsScreen () {
  const router = useRouter()
  const colors = useThemeColors()
  const version = Constants.expoConfig?.version ?? '1.0.0'
  const kofiUrl = getKofiUrl()

  const items: SettingsItem[] = [
    {
      id: 'helpful-hints',
      icon: BadgeQuestionMark,
      title: 'Helpful hints',
      description: 'Show ? icons for calendar and food preference instructions',
      type: 'link',
      onPress: () => router.push('/profile/settings/helpful-hints')
    },
    { id: 'faq', icon: HelpCircle, title: 'FAQ', description: 'Common questions and answers', type: 'link', onPress: () => router.push('/profile/settings/faq') },
    { id: 'report', icon: AlertCircle, title: 'Report a problem', description: 'Send us a bug report or issue', type: 'link', onPress: () => router.push('/profile/settings/report') },
    { id: 'feature', icon: Lightbulb, title: 'Feature request', description: 'Suggest a new feature', type: 'link', onPress: () => router.push('/profile/settings/feature-request') },
    { id: 'terms', icon: FileText, title: 'Terms of service', type: 'link', onPress: () => router.push('/profile/settings/terms') },
    { id: 'privacy-policy', icon: Shield, title: 'Privacy policy', type: 'link', onPress: () => { void Linking.openURL(PRIVACY_POLICY_URL) } },
    {
      id: 'kofi',
      icon: Coffee,
      title: 'Support on Ko-fi',
      description: 'Help keep Meal of Fortune going',
      type: 'link',
      onPress: () => { void Linking.openURL(kofiUrl) }
    }
  ]

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>Help & Support</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <SettingsList items={items} themeColors={colors} />
        <Text style={[styles.version, { color: colors.textMuted }]}>App version {version}</Text>
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
  version: { fontSize: 13, marginTop: 24 }
})
