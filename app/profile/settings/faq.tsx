'use client'

import { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { ChevronLeft, ChevronDown, ChevronRight } from 'lucide-react-native'
import { useThemeColors } from '@/hooks/useTheme'

const FAQ_ITEMS: Array<{ q: string; a: string }> = [
  { q: 'What is Meal of Fortune?', a: 'Meal of Fortune helps you decide what to eat. Save meals you want, spin the wheel when you can\'t choose, plan meals on the calendar, and vote with friends in groups.' },
  { q: 'How do I add meals I want?', a: 'On Home, tap "Meals I want" and add items from the food gallery or your history. These meals are used on the Spin wheel and can be added to calendar days.' },
  { q: 'How does the Spin to pick wheel work?', a: 'Open the Spin tab. You can swipe up or down on the wheel to spin it, or tap the Spin button for a fixed spin. The meal that lines up with the center (green triangles) is your result. The "You got" banner updates as the wheel moves and shows the final meal when it stops.' },
  { q: 'Can I choose which meals are on the wheel?', a: 'Yes. From Home, open "Meals I want" and use the option to add meals to the spin list. Only those meals appear on the wheel. If you don\'t select any, all your "Meals I want" are used.' },
  { q: 'How do I add a meal to a specific day?', a: 'Open the Calendar tab, tap a day, then "Add meal to this day" and pick a meal from your list. You can also set a reminder date and time for that day.' },
  { q: 'How do reminders work?', a: 'When adding or editing a meal on a day, you can set a reminder. In Profile → Settings → Notifications you can manage notification permissions and quiet hours.' },
  { q: 'How do I join or create a group?', a: 'Use the Social tab to create a group or enter a friend\'s group code to join. In a group you can vote on meals together and see what others want.' },
  { q: 'Where do I find my friend code?', a: 'In Profile, your friend code is shown under your name. Tap it to copy or share. Others can enter this code in Social to add you or join your group.' },
  { q: 'Can I change my dietary preferences?', a: 'Yes. Go to Profile → Settings. Use "Food preferences" (or "Don\'t want today") to set likes, dislikes, and items you don\'t want today. These can affect suggestions and filtering.' },
  { q: 'How do I change my profile picture?', a: 'In Profile, tap your avatar. You can upload a photo from your device or choose a food avatar from our gallery (Profile → Settings → Choose food avatar).' },
  { q: 'How do I edit my username or profile?', a: 'Open Profile and tap your username, or go to Profile → Settings and use the profile section. From there you can edit display name and other profile details.' },
  { q: 'Where are notification and reminder settings?', a: 'Go to Profile → Settings → Notifications. There you can turn reminders and other notifications on or off, and set quiet hours so you aren\'t disturbed at night.' },
  { q: 'Can I use dark mode?', a: 'Yes. In Profile → Settings (or your device settings, depending on the app), you can switch between light and dark theme. The app follows your choice across all screens.' },
  { q: 'How do I change my email or password?', a: 'Profile → Settings → Account. There you can change email, password, set up two-factor authentication, and manage account security.' },
  { q: 'Where do I control privacy and visibility?', a: 'Profile → Settings → Privacy. You can control who sees your profile, whether you appear in search, and how your data is used. Your friend code visibility can be adjusted there too.' },
  { q: 'How do I report a bug or suggest a feature?', a: 'Go to Profile → Settings → Help & Support. Use "Report a problem" to send a bug report or "Feature request" to suggest an idea. Your message is sent to our team.' }
]

export default function FAQScreen () {
  const router = useRouter()
  const colors = useThemeColors()
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  const toggle = (index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index))
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>FAQ</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {FAQ_ITEMS.map((item, i) => {
          const isExpanded = expandedIndex === i
          return (
            <View
              key={i}
              style={[styles.item, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            >
              <TouchableOpacity
                style={styles.questionRow}
                onPress={() => toggle(i)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ expanded: isExpanded }}
                accessibilityLabel={`${item.q}. ${isExpanded ? 'Collapse' : 'Expand'}`}
              >
                <Text style={[styles.question, { color: colors.text }]} numberOfLines={isExpanded ? undefined : 2}>
                  {item.q}
                </Text>
                {isExpanded ? (
                  <ChevronDown size={20} color={colors.textMuted} style={styles.chevron} />
                ) : (
                  <ChevronRight size={20} color={colors.textMuted} style={styles.chevron} />
                )}
              </TouchableOpacity>
              {isExpanded && (
                <View style={styles.answerWrap}>
                  <Text style={[styles.answer, { color: colors.textMuted }]}>{item.a}</Text>
                </View>
              )}
            </View>
          )
        })}
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
  item: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden'
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingRight: 12
  },
  question: { fontSize: 16, fontWeight: '600', flex: 1, marginRight: 8 },
  chevron: { marginLeft: 4 },
  answerWrap: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 0 },
  answer: { fontSize: 14, lineHeight: 20 }
})
