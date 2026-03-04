'use client'

import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Switch
} from 'react-native'
import { X, Coffee, Sun, Moon } from 'lucide-react-native'
import type { MealSlot } from '@/types/calendar'
import { dateKey } from '@/types/calendar'
import DateWheelPicker from '@/components/calendar/DateWheelPicker'

const SLOTS: { id: MealSlot; label: string; Icon: typeof Coffee }[] = [
  { id: 'breakfast', label: 'Breakfast', Icon: Coffee },
  { id: 'lunch', label: 'Lunch', Icon: Sun },
  { id: 'dinner', label: 'Dinner', Icon: Moon }
]

type ScheduleGroupMealModalProps = {
  visible: boolean
  sessionId: string
  suggestionId: string
  suggestionTitle: string
  onClose: () => void
  onScheduled: () => void
  scheduleGroupMeals: (params: {
    sessionId: string
    scheduleData: Array<{ date: string; slot: MealSlot; suggestion_id: string }>
    sendAsSuggestion: boolean
    notifyMembers: boolean
  }) => Promise<void>
}

export default function ScheduleGroupMealModal ({
  visible,
  sessionId,
  suggestionId,
  suggestionTitle,
  onClose,
  onScheduled,
  scheduleGroupMeals
}: ScheduleGroupMealModalProps) {
  const today = new Date()
  const [selectedDate, setSelectedDate] = useState<string>(dateKey(today))
  const [selectedSlot, setSelectedSlot] = useState<MealSlot>('dinner')
  const [sendAsSuggestion, setSendAsSuggestion] = useState(true)
  const [notifyMembers, setNotifyMembers] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setError(null)
    setSubmitting(true)
    try {
      await scheduleGroupMeals({
        sessionId,
        scheduleData: [
          { date: selectedDate, slot: selectedSlot, suggestion_id: suggestionId }
        ],
        sendAsSuggestion,
        notifyMembers
      })
      onScheduled()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to schedule')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Schedule for group</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          <Text style={styles.mealTitle} numberOfLines={2}>{suggestionTitle}</Text>

          <Text style={styles.label}>Date</Text>
          <DateWheelPicker
            value={selectedDate}
            onChange={setSelectedDate}
            minYear={today.getFullYear()}
            maxYear={today.getFullYear() + 1}
          />

          <Text style={styles.label}>Meal</Text>
          <View style={styles.slots}>
            {SLOTS.map(({ id, label, Icon }) => {
              const isSelected = selectedSlot === id
              return (
                <TouchableOpacity
                  key={id}
                  style={[styles.slotBtn, isSelected && styles.slotBtnSelected]}
                  onPress={() => setSelectedSlot(id)}>
                  <Icon size={22} color={isSelected ? '#fff' : '#64748b'} />
                  <Text style={[styles.slotText, isSelected && styles.slotTextSelected]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Send as suggestion (members can accept or decline)</Text>
            <Switch
              value={sendAsSuggestion}
              onValueChange={setSendAsSuggestion}
              trackColor={{ false: '#cbd5e1', true: '#86efac' }}
              thumbColor={sendAsSuggestion ? '#22c55e' : '#94a3b8'}
            />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Notify members</Text>
            <Switch
              value={notifyMembers}
              onValueChange={setNotifyMembers}
              trackColor={{ false: '#cbd5e1', true: '#86efac' }}
              thumbColor={notifyMembers ? '#22c55e' : '#94a3b8'}
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.confirmBtn, submitting && styles.confirmBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}>
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.confirmBtnText}>
                {sendAsSuggestion ? 'Send suggestion to group' : 'Set as group meal plan'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end'
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 32
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  title: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  closeBtn: { padding: 4 },
  mealTitle: { fontSize: 14, color: '#64748b', marginVertical: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#475569', marginTop: 12, marginBottom: 6 },
  slots: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  slotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#f1f5f9'
  },
  slotBtnSelected: { backgroundColor: '#22c55e' },
  slotText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  slotTextSelected: { color: '#fff' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16
  },
  switchLabel: { flex: 1, fontSize: 14, color: '#475569', marginRight: 12 },
  errorText: { fontSize: 14, color: '#dc2626', marginTop: 8 },
  confirmBtn: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20
  },
  confirmBtnDisabled: { opacity: 0.7 },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' }
})
