'use client'

import { useCallback, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import DateTimePicker from '@react-native-community/datetimepicker'
import { ChevronLeft, Bell } from 'lucide-react-native'
import { useThemeColors } from '@/hooks/useTheme'
import { useSocialAuth } from '@/hooks/useSocialAuth'
import { useProfileSettings } from '@/hooks/useProfileSettings'
import SettingsList from '@/components/profile/SettingsList'
import type { SettingsItem } from '@/components/profile/SettingsItem'
import type { NotificationSettings } from '@/types/profile-settings'

function timeStringToDate (s: string): Date {
  const [h, m] = s.split(':').map(Number)
  const d = new Date()
  d.setHours(h ?? 18, m ?? 0, 0, 0)
  return d
}

function dateToTimeString (d: Date): string {
  const h = d.getHours()
  const m = d.getMinutes()
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export default function NotificationSettingsScreen () {
  const router = useRouter()
  const colors = useThemeColors()
  const { profile, refreshProfile } = useSocialAuth()
  const { updateProfile, getNotificationSettings } = useProfileSettings(profile?.auth_id ?? undefined, profile, refreshProfile)
  const settings = getNotificationSettings()
  const [timePickerMode, setTimePickerMode] = useState<'default_time' | 'quiet_start' | 'quiet_end' | null>(null)
  const [timePickerValue, setTimePickerValue] = useState(new Date())

  const updateNotifications = useCallback((patch: Partial<NotificationSettings>) => {
    const next = { ...settings, ...patch } as NotificationSettings
    void updateProfile({ notification_settings: next })
  }, [settings, updateProfile])

  const openTimePicker = (mode: 'default_time' | 'quiet_start' | 'quiet_end') => {
    const s = mode === 'default_time' ? settings.meal_reminders.default_time : mode === 'quiet_start' ? settings.quiet_hours.start : settings.quiet_hours.end
    setTimePickerValue(timeStringToDate(s))
    setTimePickerMode(mode)
  }

  const onTimePickerChange = (_: unknown, d?: Date) => {
    const mode = timePickerMode
    if (Platform.OS === 'android') setTimePickerMode(null)
    if (!d || !mode) return
    setTimePickerValue(d)
    const t = dateToTimeString(d)
    if (mode === 'default_time') {
      updateNotifications({ meal_reminders: { ...settings.meal_reminders, default_time: t } })
    } else if (mode === 'quiet_start') {
      updateNotifications({ quiet_hours: { ...settings.quiet_hours, start: t } })
    } else if (mode === 'quiet_end') {
      updateNotifications({ quiet_hours: { ...settings.quiet_hours, end: t } })
    }
  }

  const BellIcon = Bell
  const items: SettingsItem[] = [
    { id: 'meal-reminders', icon: BellIcon, title: 'Meal reminders', description: `Default ${settings.meal_reminders.default_time}`, type: 'toggle', value: settings.meal_reminders.enabled, onValueChange: (v) => updateNotifications({ meal_reminders: { ...settings.meal_reminders, enabled: v } }) },
    { id: 'friend-requests', icon: BellIcon, title: 'Friend requests', type: 'toggle', value: settings.friend_requests.push, onValueChange: (v) => updateNotifications({ friend_requests: { ...settings.friend_requests, push: v } }) },
    { id: 'group-invites', icon: BellIcon, title: 'Group invites', type: 'toggle', value: settings.group_invites.push, onValueChange: (v) => updateNotifications({ group_invites: { ...settings.group_invites, push: v } }) },
    { id: 'voting-started', icon: BellIcon, title: 'Voting session started', type: 'toggle', value: settings.voting_started.push, onValueChange: (v) => updateNotifications({ voting_started: { ...settings.voting_started, push: v } }) },
    { id: 'new-suggestions', icon: BellIcon, title: 'New suggestions in my groups', type: 'toggle', value: settings.new_suggestions.push, onValueChange: (v) => updateNotifications({ new_suggestions: { ...settings.new_suggestions, push: v } }) },
    { id: 'votes-on-mine', icon: BellIcon, title: 'Someone voted on my suggestion', type: 'toggle', value: settings.votes_on_mine.push, onValueChange: (v) => updateNotifications({ votes_on_mine: { ...settings.votes_on_mine, push: v } }) },
    { id: 'voting-results', icon: BellIcon, title: 'Voting results', type: 'toggle', value: settings.voting_results.push, onValueChange: (v) => updateNotifications({ voting_results: { ...settings.voting_results, push: v } }) },
    { id: 'deadline-reminders', icon: BellIcon, title: 'Deadline reminders (30min, 1hr, 2hr)', type: 'toggle', value: settings.deadline_reminders.enabled, onValueChange: (v) => updateNotifications({ deadline_reminders: { ...settings.deadline_reminders, enabled: v } }) },
    { id: 'weekly-summary', icon: BellIcon, title: 'Weekly summary', type: 'toggle', value: settings.weekly_summary, onValueChange: (v) => updateNotifications({ weekly_summary: v }) },
    { id: 'marketing', icon: BellIcon, title: 'Marketing / promotional emails', type: 'toggle', value: settings.marketing_emails, onValueChange: (v) => updateNotifications({ marketing_emails: v }) },
    { id: 'quiet-hours', icon: BellIcon, title: 'Quiet hours', description: `${settings.quiet_hours.start} – ${settings.quiet_hours.end}`, type: 'toggle', value: settings.quiet_hours.enabled, onValueChange: (v) => updateNotifications({ quiet_hours: { ...settings.quiet_hours, enabled: v } }) }
  ]

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>Notifications</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>Saved to your profile. Push delivery depends on device permissions.</Text>
        <SettingsList items={items} themeColors={colors} />
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Times</Text>
        <TouchableOpacity style={[styles.timeRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} onPress={() => openTimePicker('default_time')} activeOpacity={0.7}>
          <Text style={[styles.timeRowLabel, { color: colors.text }]}>Default reminder time</Text>
          <Text style={[styles.timeRowValue, { color: colors.primary }]}>{settings.meal_reminders.default_time}</Text>
        </TouchableOpacity>
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Quiet hours</Text>
        <View style={styles.quietRow}>
          <Text style={[styles.quietLabel, { color: colors.textMuted }]}>No notifications between these times</Text>
          <View style={styles.quietSwatch}>
            <TouchableOpacity style={[styles.timeRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} onPress={() => openTimePicker('quiet_start')} activeOpacity={0.7}>
              <Text style={[styles.timeRowLabel, { color: colors.text }]}>Start</Text>
              <Text style={[styles.timeRowValue, { color: colors.primary }]}>{settings.quiet_hours.start}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.timeRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} onPress={() => openTimePicker('quiet_end')} activeOpacity={0.7}>
              <Text style={[styles.timeRowLabel, { color: colors.text }]}>End</Text>
              <Text style={[styles.timeRowValue, { color: colors.primary }]}>{settings.quiet_hours.end}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      {timePickerMode !== null && (
        Platform.OS === 'ios' ? (
          <Modal transparent animationType="slide">
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setTimePickerMode(null)}>
              <View style={[styles.pickerSheet, { backgroundColor: colors.card }]}>
                <View style={styles.pickerHeader}>
                  <TouchableOpacity onPress={() => setTimePickerMode(null)}><Text style={[styles.pickerDone, { color: colors.primary }]}>Done</Text></TouchableOpacity>
                </View>
                <DateTimePicker value={timePickerValue} mode="time" display="spinner" onChange={onTimePickerChange} />
              </View>
            </TouchableOpacity>
          </Modal>
        ) : (
          <DateTimePicker value={timePickerValue} mode="time" display="default" onChange={onTimePickerChange} />
        )
      )}
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
  subtitle: { fontSize: 14, marginBottom: 16 },
  sectionLabel: { fontSize: 14, fontWeight: '600', marginTop: 20, marginBottom: 8 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1 },
  timeRowLabel: { fontSize: 16 },
  timeRowValue: { fontSize: 16, fontWeight: '600' },
  quietRow: { marginBottom: 8 },
  quietLabel: { fontSize: 14, marginBottom: 8 },
  quietSwatch: { gap: 8 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  pickerSheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 24 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'flex-end', padding: 16 },
  pickerDone: { fontSize: 17, fontWeight: '600' }
})
