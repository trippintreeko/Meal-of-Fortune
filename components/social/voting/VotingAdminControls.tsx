'use client'

import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import { Clock, XCircle, CheckCircle } from 'lucide-react-native'
import { useThemeColors } from '@/hooks/useTheme'
import { useClockFormat } from '@/hooks/useClockFormat'
import type { ThemeColors } from '@/lib/theme-colors'
import { LIGHT_COLORS } from '@/lib/theme-colors'
import ChangeDeadlineModal from './ChangeDeadlineModal'

type VotingAdminControlsProps = {
  sessionId: string
  currentDeadline: string
  onExtendDeadline: () => void
  onCancel: () => void
  onClosePoll: () => void
  extendDeadline: (sessionId: string, newDeadline: string) => Promise<void>
  cancelVotingSession: (sessionId: string) => Promise<void>
  completeVotingSession: (sessionId: string) => Promise<void>
  themeColors?: ThemeColors
}

export default function VotingAdminControls ({
  sessionId,
  currentDeadline,
  onExtendDeadline,
  onCancel,
  onClosePoll,
  extendDeadline,
  cancelVotingSession,
  completeVotingSession,
  themeColors
}: VotingAdminControlsProps) {
  const c = themeColors ?? LIGHT_COLORS
  const { is24Hour } = useClockFormat()
  const [showDeadlineModal, setShowDeadlineModal] = useState(false)
  const [changing, setChanging] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [closing, setClosing] = useState(false)

  const handleChangeDeadlineConfirm = (newDeadline: string) => {
    setChanging(true)
    extendDeadline(sessionId, newDeadline)
      .then(onExtendDeadline)
      .catch((err) => Alert.alert('Error', err?.message ?? 'Could not update deadline'))
      .finally(() => setChanging(false))
  }

  const handleClosePollPress = () => {
    Alert.alert(
      'Close poll',
      'End the vote now and show results? This cannot be undone.',
      [
        { text: 'Keep vote', style: 'cancel' },
        {
          text: 'Close poll',
          onPress: () => {
            setClosing(true)
            completeVotingSession(sessionId).then(onClosePoll).finally(() => setClosing(false))
          }
        }
      ]
    )
  }

  const handleCancelPress = () => {
    Alert.alert(
      'Cancel vote',
      'Are you sure? No one will be able to vote after you cancel.',
      [
        { text: 'Keep vote', style: 'cancel' },
        {
          text: 'Cancel vote',
          style: 'destructive',
          onPress: () => {
            setCancelling(true)
            cancelVotingSession(sessionId).then(onCancel).finally(() => setCancelling(false))
          }
        }
      ]
    )
  }

  return (
    <View style={[styles.wrapper, { backgroundColor: c.secondaryBg, borderColor: c.border }]}>
      <Text style={[styles.label, { color: c.text }]}>Admin</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.btn, styles.changeDeadlineBtn, changing && styles.btnDisabled]}
          onPress={() => setShowDeadlineModal(true)}
          disabled={changing}
        >
          <Clock size={18} color="#fff" />
          <Text style={styles.btnText}>Change deadline</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.closePollBtn, closing && styles.btnDisabled]}
          onPress={handleClosePollPress}
          disabled={closing}
        >
          <CheckCircle size={18} color="#fff" />
          <Text style={styles.btnText}>Close poll</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.cancelBtn, cancelling && styles.btnDisabled]}
          onPress={handleCancelPress}
          disabled={cancelling}
        >
          <XCircle size={18} color="#fff" />
          <Text style={styles.btnText}>Cancel vote</Text>
        </TouchableOpacity>
      </View>
      <ChangeDeadlineModal
        visible={showDeadlineModal}
        currentDeadline={currentDeadline}
        is24Hour={is24Hour}
        onConfirm={handleChangeDeadlineConfirm}
        onClose={() => setShowDeadlineModal(false)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1
  },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  changeDeadlineBtn: { backgroundColor: '#0ea5e9' },
  closePollBtn: { backgroundColor: '#22c55e' },
  cancelBtn: { backgroundColor: '#dc2626' },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '600' }
})
