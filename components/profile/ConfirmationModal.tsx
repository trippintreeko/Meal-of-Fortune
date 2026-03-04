import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable
} from 'react-native'

type ConfirmationModalProps = {
  visible: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  destructive?: boolean
}

export default function ConfirmationModal ({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  destructive = false
}: ConfirmationModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.box} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.cancelBtn]}
              onPress={onCancel}
              activeOpacity={0.8}>
              <Text style={styles.cancelBtnText}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, destructive ? styles.destructiveBtn : styles.confirmBtn]}
              onPress={onConfirm}
              activeOpacity={0.8}>
              <Text style={styles.confirmBtnText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
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
  box: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8
  },
  message: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 22,
    marginBottom: 24
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end'
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10
  },
  cancelBtn: {
    backgroundColor: '#f1f5f9'
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b'
  },
  confirmBtn: {
    backgroundColor: '#22c55e'
  },
  destructiveBtn: {
    backgroundColor: '#dc2626'
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff'
  }
})
