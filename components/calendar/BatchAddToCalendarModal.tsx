import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity
} from 'react-native'
import { X } from 'lucide-react-native'
import { useThemeColors } from '@/hooks/useTheme'
import type { SavedMeal, MealSlot } from '@/types/calendar'
import { dateKey, addDaysToDateKey } from '@/types/calendar'
import DateWheelPicker from './DateWheelPicker'

const SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner']

type BatchAddToCalendarModalProps = {
  visible: boolean
  selectedMeals: SavedMeal[]
  onClose: () => void
  onConfirm: (dateKeyByMealId: Map<string, { date: string; slot: MealSlot }>) => Promise<void>
}

export default function BatchAddToCalendarModal ({
  visible,
  selectedMeals,
  onClose,
  onConfirm
}: BatchAddToCalendarModalProps) {
  const colors = useThemeColors()
  const today = new Date()
  const [startDate, setStartDate] = useState<string>(dateKey(today))

  const handleConfirm = async () => {
    const map = new Map<string, { date: string; slot: MealSlot }>()
    selectedMeals.forEach((meal, i) => {
      const dateOffset = Math.floor(i / 3)
      const slot = SLOTS[i % 3]
      map.set(meal.id, { date: addDaysToDateKey(startDate, dateOffset), slot })
    })
    await onConfirm(map)
    onClose()
  }

  if (selectedMeals.length === 0) return null

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Add to calendar</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Add {selectedMeals.length} meal{selectedMeals.length === 1 ? '' : 's'} starting from:
          </Text>
          <Text style={[styles.label, { color: colors.text }]}>Start date</Text>
          <DateWheelPicker
            value={startDate}
            onChange={setStartDate}
            minYear={today.getFullYear()}
            maxYear={today.getFullYear() + 1}
            textColor={colors.text}
            centerHighlightBackground={`${colors.primary}26`}
          />
          <Text style={[styles.hint, { color: colors.placeholder }]}>
            Meals will be added as breakfast, lunch, dinner in order. Extra meals go to the next day.
          </Text>
          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
            onPress={handleConfirm}
          >
            <Text style={[styles.confirmBtnText, { color: colors.primaryText }]}>
              Add {selectedMeals.length} to calendar
            </Text>
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
    marginBottom: 8
  },
  title: {
    fontSize: 20,
    fontWeight: '700'
  },
  closeBtn: { padding: 4 },
  subtitle: {
    fontSize: 15,
    marginBottom: 16
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10
  },
  hint: {
    fontSize: 12,
    marginBottom: 20
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
