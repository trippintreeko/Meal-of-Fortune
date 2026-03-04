import { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity
} from 'react-native'
import { X, Coffee, Sun, Moon } from 'lucide-react-native'
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
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Move to</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

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
                  <Icon size={22} color={isSelected ? '#ffffff' : '#64748b'} />
                  <Text
                    style={[
                      styles.slotText,
                      isSelected && styles.slotTextSelected
                    ]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
            <Text style={styles.confirmBtnText}>Move</Text>
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
    marginBottom: 20
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b'
  },
  closeBtn: { padding: 4 },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
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
    borderRadius: 12,
    backgroundColor: '#f1f5f9'
  },
  slotBtnSelected: {
    backgroundColor: '#22c55e'
  },
  slotText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b'
  },
  slotTextSelected: {
    color: '#ffffff'
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
