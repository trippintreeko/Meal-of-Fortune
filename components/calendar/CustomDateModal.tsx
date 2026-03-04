import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native'
import { X } from 'lucide-react-native'
import { dateKey } from '@/types/calendar'

function getNextDays (count: number): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = []
  const today = new Date()
  for (let i = 0; i < count; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    out.push({
      key: dateKey(d),
      label: d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    })
  }
  return out
}

const CUSTOM_DAYS = getNextDays(365)

type CustomDateModalProps = {
  visible: boolean
  title?: string
  onClose: () => void
  onSelect: (dateKey: string) => void
}

export default function CustomDateModal ({
  visible,
  title = 'Pick a date',
  onClose,
  onSelect
}: CustomDateModalProps) {
  const handleSelect = (key: string) => {
    onSelect(key)
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
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}>
            {CUSTOM_DAYS.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={styles.row}
                onPress={() => handleSelect(key)}
                activeOpacity={0.7}>
                <Text style={styles.rowText}>{label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
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
    maxHeight: '80%'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b'
  },
  closeBtn: { padding: 4 },
  scroll: {
    maxHeight: 400
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32
  },
  row: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: '#f8fafc'
  },
  rowText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b'
  }
})
