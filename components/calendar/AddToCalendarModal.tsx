import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity
} from 'react-native'
import { X, Coffee, Sun, Moon } from 'lucide-react-native'
import { useThemeColors } from '@/hooks/useTheme'
import type { MealSlot } from '@/types/calendar'
import { dateKey } from '@/types/calendar'
import DateWheelPicker from './DateWheelPicker'

const SLOTS: { id: MealSlot; label: string; Icon: typeof Coffee }[] = [
  { id: 'breakfast', label: 'Breakfast', Icon: Coffee },
  { id: 'lunch', label: 'Lunch', Icon: Sun },
  { id: 'dinner', label: 'Dinner', Icon: Moon }
]

type AddToCalendarModalProps = {
  visible: boolean
  mealTitle: string
  defaultDate?: string // YYYY-MM-DD; when adding from day detail, prefill
  confirmLabel?: string
  onClose: () => void
  onConfirm: (date: string, slot: MealSlot) => void
}

export default function AddToCalendarModal ({
  visible,
  mealTitle,
  defaultDate,
  confirmLabel = 'Add to calendar',
  onClose,
  onConfirm
}: AddToCalendarModalProps) {
  const colors = useThemeColors()
  const today = new Date()
  const [selectedDate, setSelectedDate] = useState<string>(
    defaultDate ?? dateKey(today)
  )
  const [selectedSlot, setSelectedSlot] = useState<MealSlot>('lunch')

  const handleConfirm = () => {
    onConfirm(selectedDate, selectedSlot)
    onClose()
  }

  const sheetStyle = [styles.sheet, { backgroundColor: colors.card }]
  const titleStyle = [styles.title, { color: colors.text }]
  const mealTitleStyle = [styles.mealTitle, { color: colors.textMuted }]
  const labelStyle = [styles.label, { color: colors.text }]
  const slotBtnStyle = [styles.slotBtn, { backgroundColor: colors.secondaryBg }]
  const slotBtnSelectedStyle = [styles.slotBtnSelected, { backgroundColor: colors.primary }]
  const slotTextStyle = [styles.slotText, { color: colors.textMuted }]
  const slotTextSelectedStyle = [styles.slotTextSelected, { color: colors.primaryText }]
  const confirmBtnStyle = [styles.confirmBtn, { backgroundColor: colors.primary }]

  return (
    <Modal
      visible={visible}
      animationType="slide"
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
        <View style={sheetStyle} pointerEvents="box-none">
          <View style={styles.header}>
            <Text style={titleStyle}>Add to calendar</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={mealTitleStyle} numberOfLines={1}>{mealTitle}</Text>

          <Text style={labelStyle}>Date</Text>
          <DateWheelPicker
            value={selectedDate}
            onChange={setSelectedDate}
            minYear={today.getFullYear()}
            maxYear={today.getFullYear() + 1}
            textColor={colors.text}
          />

          <Text style={labelStyle}>Meal</Text>
          <View style={styles.slots}>
            {SLOTS.map(({ id, label, Icon }) => {
              const isSelected = selectedSlot === id
              return (
                <TouchableOpacity
                  key={id}
                  style={[styles.slotBtn, isSelected ? slotBtnSelectedStyle : slotBtnStyle]}
                  onPress={() => setSelectedSlot(id)}>
                  <Icon size={22} color={isSelected ? colors.primaryText : colors.textMuted} />
                  <Text
                    style={[
                      styles.slotText,
                      isSelected ? slotTextSelectedStyle : slotTextStyle
                    ]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <TouchableOpacity style={confirmBtnStyle} onPress={handleConfirm}>
            <Text style={styles.confirmBtnText}>{confirmLabel}</Text>
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  title: {
    fontSize: 20,
    fontWeight: '700'
  },
  closeBtn: { padding: 4 },
  mealTitle: {
    fontSize: 15,
    marginBottom: 20
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10
  },
  slots: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24
  },
  slotBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12
  },
  slotBtnSelected: {},
  slotText: {
    fontSize: 14,
    fontWeight: '600'
  },
  slotTextSelected: {},
  confirmBtn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center'
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff'
  }
})
