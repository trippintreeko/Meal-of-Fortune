'use client'

import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator
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

type ScheduleMealModalProps = {
  visible: boolean
  sessionId: string
  winnerTitle: string
  onClose: () => void
  onScheduled: () => void
  scheduleWinningMeal: (
    sessionId: string,
    mealDate: string,
    mealSlot: MealSlot
  ) => Promise<{
    winner_suggestion_id: string
    suggestion_text: string
    vote_count: number
    total_voters: number
    suggested_by: string
  } | null>
  addVotingEventToCalendar: (params: {
    date: string
    mealSlot: MealSlot
    title: string
    sessionId: string
    winnerId: string
    voteCount: number
    totalVoters: number
    suggestedBy?: string
  }) => Promise<void>
}

export default function ScheduleMealModal ({
  visible,
  sessionId,
  winnerTitle,
  onClose,
  onScheduled,
  scheduleWinningMeal,
  addVotingEventToCalendar
}: ScheduleMealModalProps) {
  const today = new Date()
  const [selectedDate, setSelectedDate] = useState<string>(dateKey(today))
  const [selectedSlot, setSelectedSlot] = useState<MealSlot>('dinner')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    setError(null)
    setSubmitting(true)
    try {
      const result = await scheduleWinningMeal(sessionId, selectedDate, selectedSlot)
      if (result) {
        await addVotingEventToCalendar({
          date: selectedDate,
          mealSlot: selectedSlot,
          title: result.suggestion_text || winnerTitle,
          sessionId,
          winnerId: result.winner_suggestion_id,
          voteCount: result.vote_count,
          totalVoters: result.total_voters,
          suggestedBy: result.suggested_by || undefined
        })
        onScheduled()
        onClose()
      } else {
        setError('Could not schedule meal')
      }
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
            <Text style={styles.title}>Schedule meal</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          <Text style={styles.winnerLabel}>Winner: {winnerTitle}</Text>

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

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.confirmBtn, submitting && styles.confirmBtnDisabled]}
            onPress={handleConfirm}
            disabled={submitting}>
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.confirmBtnText}>Add to my calendar</Text>
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
  winnerLabel: { fontSize: 14, color: '#64748b', marginVertical: 8 },
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
