'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator
} from 'react-native'
import { X } from 'lucide-react-native'
import type { ThemeColors } from '@/lib/theme-colors'
import { LIGHT_COLORS } from '@/lib/theme-colors'
import { dateKey, parseDateKey } from '@/types/calendar'
import DateWheelPicker from '@/components/calendar/DateWheelPicker'
import { sanitizeText, MAX_LENGTH } from '@/lib/sanitize-input'

function clamp (n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

type StartVoteModalProps = {
  visible: boolean
  groupId: string
  onClose: () => void
  onStarted: (sessionId: string) => void
  startVotingSession: (groupId: string, deadline: string, description?: string) => Promise<string | null>
  themeColors?: ThemeColors
}

export default function StartVoteModal ({
  visible,
  groupId,
  onClose,
  onStarted,
  startVotingSession,
  themeColors = LIGHT_COLORS
}: StartVoteModalProps) {
  const c = themeColors
  const now = new Date()
  const defaultDeadline = useMemo(() => {
    const d = new Date(now)
    d.setHours(20, 0, 0, 0)
    if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1)
    return d
  }, [])
  const [deadlineDate, setDeadlineDate] = useState<string>(dateKey(defaultDeadline))
  const [deadlineHour, setDeadlineHour] = useState<number>(defaultDeadline.getHours())
  const [deadlineMinute, setDeadlineMinute] = useState<number>(defaultDeadline.getMinutes())
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!visible) return
    setDeadlineDate(dateKey(defaultDeadline))
    setDeadlineHour(defaultDeadline.getHours())
    setDeadlineMinute(defaultDeadline.getMinutes())
  }, [visible, defaultDeadline])

  const hourStr = String(clamp(deadlineHour, 0, 23))
  const minuteStr = String(clamp(deadlineMinute, 0, 59))

  const deadlineISO = useMemo(() => {
    const d = parseDateKey(deadlineDate)
    d.setHours(clamp(deadlineHour, 0, 23), clamp(deadlineMinute, 0, 59), 0, 0)
    return d.toISOString()
  }, [deadlineDate, deadlineHour, deadlineMinute])

  const handleStart = async () => {
    setError(null)
    setSubmitting(true)
    try {
      const sessionId = await startVotingSession(
        groupId,
        deadlineISO,
        sanitizeText(description, { allowNewlines: true, maxLength: MAX_LENGTH.voteDescription }).trim() || undefined
      )
      if (sessionId) {
        setDescription('')
        onStarted(sessionId)
        onClose()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start vote')
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
        <View style={[styles.sheet, { backgroundColor: c.card }]}>
          <View style={[styles.header, { borderBottomColor: c.border }]}>
            <Text style={[styles.title, { color: c.text }]}>Start vote</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color={c.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { color: c.textMuted }]}>Voting deadline – date</Text>
          <DateWheelPicker
            value={deadlineDate}
            onChange={setDeadlineDate}
            minYear={now.getFullYear()}
            maxYear={now.getFullYear() + 1}
          />

          <Text style={[styles.label, { color: c.textMuted }]}>Time (any time)</Text>
          <View style={styles.timeRow}>
            <View style={styles.timeInputGroup}>
              <Text style={[styles.timeInputLabel, { color: c.textMuted }]}>Hour (0–23)</Text>
              <TextInput
                style={[styles.timeInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]}
                value={hourStr}
                onChangeText={(t) => {
                  const n = parseInt(t.replace(/\D/g, ''), 10)
                  if (t === '' || isNaN(n)) setDeadlineHour(0)
                  else setDeadlineHour(clamp(n, 0, 23))
                }}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="20"
                placeholderTextColor={c.placeholder}
              />
            </View>
            <View style={styles.timeInputGroup}>
              <Text style={[styles.timeInputLabel, { color: c.textMuted }]}>Minute (0–59)</Text>
              <TextInput
                style={[styles.timeInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]}
                value={minuteStr}
                onChangeText={(t) => {
                  const n = parseInt(t.replace(/\D/g, ''), 10)
                  if (t === '' || isNaN(n)) setDeadlineMinute(0)
                  else setDeadlineMinute(clamp(n, 0, 59))
                }}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="0"
                placeholderTextColor={c.placeholder}
              />
            </View>
          </View>
          <Text style={[styles.timeHint, { color: c.textMuted }]}>
            {deadlineHour === 0 ? 12 : deadlineHour <= 12 ? deadlineHour : deadlineHour - 12}
            :{String(deadlineMinute).padStart(2, '0')}{' '}
            {deadlineHour < 12 ? 'AM' : 'PM'}
          </Text>

          <Text style={[styles.label, { color: c.textMuted }]}>Description (optional)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]}
            value={description}
            onChangeText={setDescription}
            placeholder="e.g. Friday dinner"
            placeholderTextColor={c.placeholder}
            multiline
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: c.primary }, submitting && styles.confirmBtnDisabled]}
            onPress={handleStart}
            disabled={submitting}>
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.confirmBtnText}>Start vote</Text>
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
    paddingBottom: 32,
    maxHeight: '90%'
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
  label: { fontSize: 14, fontWeight: '600', color: '#475569', marginTop: 12, marginBottom: 6 },
  timeRow: { flexDirection: 'row', gap: 16 },
  timeInputGroup: { flex: 1 },
  timeInputLabel: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  timeInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    fontSize: 18,
    color: '#1e293b'
  },
  timeHint: { fontSize: 13, color: '#64748b', marginTop: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#1e293b',
    minHeight: 44
  },
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
