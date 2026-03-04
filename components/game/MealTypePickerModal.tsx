import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native'
import { Coffee, Sun, Moon } from 'lucide-react-native'
import type { MealType } from '@/types/game-session'

const OPTIONS: { id: MealType; label: string; Icon: typeof Coffee }[] = [
  { id: 'breakfast', label: 'Breakfast', Icon: Coffee },
  { id: 'lunch', label: 'Lunch', Icon: Sun },
  { id: 'dinner', label: 'Dinner', Icon: Moon }
]

type MealTypePickerModalProps = {
  visible: boolean
  title?: string
  onClose: () => void
  onSelect: (mealType: MealType) => void
}

export default function MealTypePickerModal ({
  visible,
  title = 'Which meal?',
  onClose,
  onSelect
}: MealTypePickerModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.options}>
            {OPTIONS.map(({ id, label, Icon }) => (
              <TouchableOpacity
                key={id}
                style={styles.optionBtn}
                onPress={() => onSelect(id)}
                activeOpacity={0.7}>
                <Icon size={28} color="#22c55e" />
                <Text style={styles.optionText}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  box: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 20,
    textAlign: 'center'
  },
  options: {
    gap: 12
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  optionText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b'
  },
  cancelBtn: {
    marginTop: 20,
    paddingVertical: 12,
    alignItems: 'center'
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b'
  }
})
