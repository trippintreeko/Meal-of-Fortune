import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Modal, TouchableOpacity, Platform } from 'react-native'
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { X, Bell, CalendarClock } from 'lucide-react-native'
import { useThemeColors } from '@/hooks/useTheme'
import type { MealSlot } from '@/types/calendar'
import { parseDateKey } from '@/types/calendar'

const DEFAULT_MEAL_HOUR: Record<MealSlot, number> = {
  breakfast: 8,
  lunch: 12,
  dinner: 18
}

type ReminderOption = {
  id: string
  label: string
  minutesBefore: number
}

const OPTIONS: ReminderOption[] = [
  { id: '30', label: '30 min before', minutesBefore: 30 },
  { id: '60', label: '1 hour before', minutesBefore: 60 },
  { id: '0', label: 'At meal time', minutesBefore: 0 }
]

type SetReminderModalProps = {
  visible: boolean
  eventTitle: string
  eventDate: string
  mealSlot: MealSlot
  onClose: () => void
  onConfirm: (triggerAt: Date) => Promise<string | null>
}

type CustomStep = 'date' | 'time' | 'confirm'

export default function SetReminderModal ({
  visible,
  eventTitle,
  eventDate,
  mealSlot,
  onClose,
  onConfirm
}: SetReminderModalProps) {
  const colors = useThemeColors()
  const [saving, setSaving] = useState(false)
  const [showCustomPicker, setShowCustomPicker] = useState(false)
  const [customPickerStep, setCustomPickerStep] = useState<CustomStep>('date')
  const [customDate, setCustomDate] = useState<Date>(() => {
    const d = parseDateKey(eventDate)
    d.setHours(DEFAULT_MEAL_HOUR[mealSlot], 0, 0, 0)
    return d
  })

  useEffect(() => {
    if (!visible) {
      setShowCustomPicker(false)
      setCustomPickerStep('date')
      const d = parseDateKey(eventDate)
      d.setHours(DEFAULT_MEAL_HOUR[mealSlot], 0, 0, 0)
      setCustomDate(d)
    }
  }, [visible, eventDate, mealSlot])

  const handleSelect = async (opt: ReminderOption) => {
    setSaving(true)
    const d = parseDateKey(eventDate)
    const hour = DEFAULT_MEAL_HOUR[mealSlot]
    d.setHours(hour, 0, 0, 0)
    const triggerAt = new Date(d.getTime() - opt.minutesBefore * 60 * 1000)
    if (triggerAt.getTime() < Date.now()) {
      setSaving(false)
      onClose()
      return
    }
    await onConfirm(triggerAt)
    setSaving(false)
    onClose()
  }

  const handleCustomConfirm = async () => {
    if (customDate.getTime() < Date.now()) return
    setSaving(true)
    await onConfirm(customDate)
    setSaving(false)
    setShowCustomPicker(false)
    setCustomPickerStep('date')
    onClose()
  }

  const handlePickerChange = (event: DateTimePickerEvent, d?: Date) => {
    const evtType = event?.type
    if (Platform.OS === 'android' && evtType === 'dismissed') {
      if (customPickerStep === 'date') {
        setShowCustomPicker(false)
        setCustomPickerStep('date')
      } else {
        setCustomPickerStep('date')
      }
      return
    }
    if (evtType !== 'set' || !d) return
    if (Platform.OS === 'android') {
      if (customPickerStep === 'date') {
        setCustomDate((prev) => {
          const next = new Date(prev)
          next.setFullYear(d.getFullYear(), d.getMonth(), d.getDate())
          return next
        })
        setCustomPickerStep('time')
      } else {
        setCustomDate((prev) => {
          const next = new Date(prev)
          next.setHours(d.getHours(), d.getMinutes(), 0, 0)
          return next
        })
        setCustomPickerStep('confirm')
      }
    } else {
      setCustomDate(d)
    }
  }

  const boxStyle = [styles.box, { backgroundColor: colors.card }]
  const titleStyle = [styles.title, { color: colors.text }]
  const subtitleStyle = [styles.subtitle, { color: colors.textMuted }]
  const optionBtnStyle = [styles.optionBtn, { backgroundColor: colors.secondaryBg }]
  const optionTextStyle = [styles.optionText, { color: colors.text }]
  const customBtnStyle = [styles.customBtn, { borderColor: colors.primary }]
  const customBtnTextStyle = [styles.customBtnText, { color: colors.primary }]
  const confirmCustomStyle = [styles.confirmCustomBtn, { backgroundColor: colors.primary }]

  const showConfirmStep = showCustomPicker && (Platform.OS !== 'android' || customPickerStep === 'confirm')
  const showAndroidPicker = showCustomPicker && Platform.OS === 'android' && (customPickerStep === 'date' || customPickerStep === 'time')

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
          accessibilityLabel="Close modal"
          accessibilityRole="button"
        />
        <View style={boxStyle} pointerEvents="box-none">
          <View style={styles.header}>
            <Bell size={24} color={colors.primary} />
            <Text style={titleStyle}>Set reminder</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={subtitleStyle} numberOfLines={2}>{eventTitle}</Text>

          {!showCustomPicker ? (
            <>
              <View style={styles.options}>
                {OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    style={optionBtnStyle}
                    onPress={() => handleSelect(opt)}
                    disabled={saving}>
                    <Text style={optionTextStyle}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={customBtnStyle}
                onPress={() => setShowCustomPicker(true)}
                disabled={saving}>
                <CalendarClock size={20} color={colors.primary} />
                <Text style={customBtnTextStyle}>Custom date & time</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.customSection}>
              <Text style={[styles.customLabel, { color: colors.textMuted }]}>
                {Platform.OS === 'android' && customPickerStep === 'confirm'
                  ? `Remind at ${customDate.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}`
                  : 'Pick when to remind'}
              </Text>
              {showAndroidPicker && (
                <DateTimePicker
                  value={customDate}
                  mode={customPickerStep === 'time' ? 'time' : 'date'}
                  display="default"
                  minimumDate={customPickerStep === 'date' ? new Date() : undefined}
                  onChange={handlePickerChange}
                />
              )}
              {Platform.OS === 'ios' && showCustomPicker && (
                <DateTimePicker
                  value={customDate}
                  mode="datetime"
                  display="spinner"
                  minimumDate={new Date()}
                  onChange={handlePickerChange}
                />
              )}
              {showCustomPicker && (
                <View style={styles.customActions}>
                  <TouchableOpacity
                    style={[styles.backCustomBtn, { backgroundColor: colors.secondaryBg }]}
                    onPress={() => {
                      setShowCustomPicker(false)
                      setCustomPickerStep('date')
                    }}
                    disabled={saving}>
                    <Text style={[styles.backCustomText, { color: colors.text }]}>Back</Text>
                  </TouchableOpacity>
                  {(Platform.OS !== 'android' || customPickerStep === 'confirm') && (
                    <TouchableOpacity
                      style={confirmCustomStyle}
                      onPress={handleCustomConfirm}
                      disabled={saving || customDate.getTime() < Date.now()}>
                      <Text style={styles.confirmCustomText}>Set reminder</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  box: {
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 340
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1
  },
  closeBtn: { padding: 4 },
  subtitle: {
    fontSize: 14,
    marginBottom: 20
  },
  options: {
    gap: 10,
    marginBottom: 12
  },
  optionBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600'
  },
  customBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed'
  },
  customBtnText: {
    fontSize: 15,
    fontWeight: '700'
  },
  customSection: {
    marginTop: 4
  },
  customLabel: {
    fontSize: 13,
    marginBottom: 12
  },
  customActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16
  },
  backCustomBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  backCustomText: {
    fontSize: 15,
    fontWeight: '600'
  },
  confirmCustomBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  confirmCustomText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff'
  }
})
