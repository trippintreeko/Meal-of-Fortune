import { useState, useEffect } from 'react'
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

type MoveEventModalProps = {
  visible: boolean
  currentDate: string
  onClose: () => void
  onConfirm: (date: string, slot: MealSlot) => void
}

export default function MoveEventModal ({
  visible,
  currentDate,
  onClose,
  onConfirm
}: MoveEventModalProps) {
  const colors = useThemeColors()
  const today = new Date()
  const [selectedDate, setSelectedDate] = useState<string>(currentDate)
  const [selectedSlot, setSelectedSlot] = useState<MealSlot>('lunch')

  useEffect(() => {
    if (currentDate) setSelectedDate(currentDate)
  }, [currentDate])

  const handleConfirm = () => {
    onConfirm(selectedDate, selectedSlot)
    onClose()
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Move to</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { color: colors.text }]}>Date</Text>
          <DateWheelPicker
            value={selectedDate}
            onChange={setSelectedDate}
            minYear={today.getFullYear()}
            maxYear={today.getFullYear() + 1}
            textColor={colors.text}
            centerHighlightBackground={`${colors.primary}26`}
          />

          <Text style={[styles.label, { color: colors.text }]}>Meal</Text>
          <View style={styles.slots}>
            {SLOTS.map(({ id, label, Icon }) => {
              const isSelected = selectedSlot === id
              return (
                <TouchableOpacity
                  key={id}
                  style={[
                    styles.slotBtn,
                    { backgroundColor: colors.secondaryBg },
                    isSelected && { backgroundColor: colors.primary }
                  ]}
                  onPress={() => setSelectedSlot(id)}>
                  <Icon
                    size={22}
                    color={isSelected ? colors.primaryText : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.slotText,
                      { color: colors.textMuted },
                      isSelected && { color: colors.primaryText }
                    ]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
            onPress={handleConfirm}
          >
            <Text style={[styles.confirmBtnText, { color: colors.primaryText }]}>Move</Text>
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
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: 20,
    paddingBottom: 36
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  title: {
    fontSize: 20,
    fontWeight: '700'
  },
  closeBtn: { padding: 4 },
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
  slotText: {
    fontSize: 14,
    fontWeight: '600'
  },
  confirmBtn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center'
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '700'
  }
})
