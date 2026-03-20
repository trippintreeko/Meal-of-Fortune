'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform
} from 'react-native'
import { X, Calendar, Clock } from 'lucide-react-native'
import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { useThemeColors } from '@/hooks/useTheme'
import { useClockFormat } from '@/hooks/useClockFormat'
import { sanitizeText, MAX_LENGTH } from '@/lib/sanitize-input'

function formatDate (d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime (d: Date, is24Hour: boolean): string {
  if (is24Hour) {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
  }
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })
}

type StartVoteModalProps = {
  visible: boolean
  groupId: string
  onClose: () => void
  onStarted: (sessionId: string) => void
  startVotingSession: (groupId: string, deadline: string, description?: string) => Promise<string | null>
}

const defaultDeadline = (): Date => {
  const d = new Date()
  d.setHours(20, 0, 0, 0)
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1)
  return d
}

export default function StartVoteModal ({
  visible,
  groupId,
  onClose,
  onStarted,
  startVotingSession
}: StartVoteModalProps) {
  const colors = useThemeColors()
  const { is24Hour } = useClockFormat()
  const [date, setDate] = useState<Date>(defaultDeadline)
  const [pickerStep, setPickerStep] = useState<'date' | 'time' | null>(null)
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (visible) {
      setDate(defaultDeadline())
      setPickerStep(null)
    }
  }, [visible])

  const minDate = useMemo(() => new Date(), [])

  const handlePickerChange = (event: DateTimePickerEvent, d?: Date) => {
    if (Platform.OS === 'android') {
      if (event.type === 'dismissed') return
    }
    if (event.type === 'set' && d) {
      if (pickerStep === 'date') {
        setDate((prev) => {
          const next = new Date(prev)
          next.setFullYear(d.getFullYear(), d.getMonth(), d.getDate())
          return next
        })
      } else if (pickerStep === 'time') {
        setDate((prev) => {
          const next = new Date(prev)
          next.setHours(d.getHours(), d.getMinutes(), 0, 0)
          return next
        })
      }
    }
  }

  const openDatePicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: date,
        mode: 'date',
        minimumDate: minDate,
        onChange: (_, d) => {
          if (d) {
            setDate((prev) => {
              const next = new Date(prev)
              next.setFullYear(d.getFullYear(), d.getMonth(), d.getDate())
              return next
            })
          }
        }
      })
      return
    }
    setPickerStep('date')
  }

  const openTimePicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: date,
        mode: 'time',
        is24Hour,
        onChange: (_, d) => {
          if (d) {
            setDate((prev) => {
              const next = new Date(prev)
              next.setHours(d.getHours(), d.getMinutes(), 0, 0)
              return next
            })
          }
        }
      })
      return
    }
    setPickerStep('time')
  }

  const deadlineISO = date.toISOString()

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

  if (!visible) return null

  const content = (
    <View style={[styles.sheet, { backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Start vote</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <X size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={[styles.currentWrap, { backgroundColor: colors.secondaryBg }]}>
        <Text style={[styles.currentLabel, { color: colors.textMuted }]}>
          {formatDate(date)} at {formatTime(date, is24Hour)}
        </Text>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.optionBtn, { backgroundColor: colors.secondaryBg, borderColor: colors.border }]}
          onPress={openDatePicker}
        >
          <Calendar size={20} color={colors.primary} />
          <Text style={[styles.optionBtnText, { color: colors.text }]}>Change date</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.optionBtn, { backgroundColor: colors.secondaryBg, borderColor: colors.border }]}
          onPress={openTimePicker}
        >
          <Clock size={20} color={colors.primary} />
          <Text style={[styles.optionBtnText, { color: colors.text }]}>Change time</Text>
        </TouchableOpacity>
      </View>

      {Platform.OS === 'ios' && (pickerStep === 'date' || pickerStep === 'time') && (
        <View style={styles.pickerWrap}>
          <DateTimePicker
            value={date}
            mode={pickerStep === 'date' ? 'date' : 'time'}
            display="spinner"
            onChange={handlePickerChange}
            is24Hour={is24Hour}
            minimumDate={pickerStep === 'date' ? minDate : undefined}
          />
          <TouchableOpacity onPress={() => setPickerStep(null)}>
            <Text style={[styles.donePicker, { color: colors.primary }]}>Done</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={[styles.label, { color: colors.textMuted }]}>Description (optional)</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
        value={description}
        onChangeText={setDescription}
        placeholder="e.g. Friday dinner"
        placeholderTextColor={colors.textMuted}
        multiline
      />

      {error ? <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.confirmBtn, { backgroundColor: colors.primary }, submitting && styles.confirmBtnDisabled]}
        onPress={handleStart}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.confirmBtnText}>Start vote</Text>
        )}
      </TouchableOpacity>
    </View>
  )

  if (Platform.OS === 'ios') {
    return (
      <Modal transparent visible={visible} animationType="slide">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
        <View style={styles.iosSheet}>{content}</View>
      </Modal>
    )
  }

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.androidCard}>{content}</View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  iosSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden'
  },
  androidCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    overflow: 'hidden'
  },
  sheet: {
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingHorizontal: 20
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16
  },
  title: { fontSize: 18, fontWeight: '700' },
  closeBtn: { padding: 4 },
  currentWrap: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 16
  },
  currentLabel: { fontSize: 14 },
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  optionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1
  },
  optionBtnText: { fontSize: 14, fontWeight: '600' },
  pickerWrap: { marginBottom: 12 },
  donePicker: { fontSize: 16, fontWeight: '600', marginTop: 8 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    minHeight: 44
  },
  errorText: { fontSize: 14, marginTop: 8 },
  confirmBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20
  },
  confirmBtnDisabled: { opacity: 0.7 },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' }
})
