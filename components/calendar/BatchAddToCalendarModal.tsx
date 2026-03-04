import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity
} from 'react-native'
import { X } from 'lucide-react-native'
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
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Add to calendar</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>
            Add {selectedMeals.length} meal{selectedMeals.length === 1 ? '' : 's'} starting from:
          </Text>
          <Text style={styles.label}>Start date</Text>
          <DateWheelPicker
            value={startDate}
            onChange={setStartDate}
            minYear={today.getFullYear()}
            maxYear={today.getFullYear() + 1}
          />
          <Text style={styles.hint}>
            Meals will be added as breakfast, lunch, dinner in order. Extra meals go to the next day.
          </Text>
          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
            <Text style={styles.confirmBtnText}>Add {selectedMeals.length} to calendar</Text>
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
    backgroundColor: '#ffffff',
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
    fontWeight: '700',
    color: '#1e293b'
  },
  closeBtn: { padding: 4 },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    marginBottom: 16
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 10
  },
  hint: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 20
  },
  confirmBtn: {
    backgroundColor: '#22c55e',
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
