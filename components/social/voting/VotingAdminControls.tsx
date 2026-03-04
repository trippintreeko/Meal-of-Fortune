'use client'

import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput } from 'react-native'
import { Clock, XCircle, CheckCircle } from 'lucide-react-native'
import type { ThemeColors } from '@/lib/theme-colors'
import { LIGHT_COLORS } from '@/lib/theme-colors'

function clamp (n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

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
  themeColors = LIGHT_COLORS
}: VotingAdminControlsProps) {
  const c = themeColors
  const [extending, setExtending] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [closing, setClosing] = useState(false)
  const [adjustAmount, setAdjustAmount] = useState('1')
  const [adjustUnit, setAdjustUnit] = useState<'minutes' | 'hours'>('hours')

  const applyAdjustment = (direction: 1 | -1) => {
    const amount = clamp(parseInt(adjustAmount.replace(/\D/g, '') || '0', 10), 1, 999)
    const msPerMinute = 60 * 1000
    const msPerHour = 60 * msPerMinute
    const ms = adjustUnit === 'hours' ? amount * msPerHour : amount * msPerMinute
    const base = new Date(currentDeadline).getTime()
    const newTime = base + direction * ms
    const newDeadline = new Date(newTime).toISOString()
    if (newTime <= Date.now()) {
      Alert.alert(
        'Past deadline',
        'The new deadline would be in the past. Vote would effectively end now. Continue?',
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes',
            onPress: () => {
              setExtending(true)
              extendDeadline(sessionId, newDeadline).then(onExtendDeadline).finally(() => setExtending(false))
            }
          }
        ]
      )
      return
    }
    setExtending(true)
    extendDeadline(sessionId, newDeadline).then(onExtendDeadline).finally(() => setExtending(false))
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
      <View style={styles.adjustRow}>
        <TextInput
          style={[styles.amountInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]}
          value={adjustAmount}
          onChangeText={(t) => setAdjustAmount(t.replace(/\D/g, '').slice(0, 3) || '')}
          keyboardType="number-pad"
          placeholder="1"
          placeholderTextColor={c.placeholder}
        />
        <View style={styles.unitRow}>
          <TouchableOpacity
            style={[styles.unitBtn, { backgroundColor: c.border }, adjustUnit === 'minutes' && [styles.unitBtnSelected, { backgroundColor: c.primary }]]}
            onPress={() => setAdjustUnit('minutes')}
          >
            <Text style={[styles.unitBtnText, { color: c.textMuted }, adjustUnit === 'minutes' && styles.unitBtnTextSelected]}>min</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.unitBtn, { backgroundColor: c.border }, adjustUnit === 'hours' && [styles.unitBtnSelected, { backgroundColor: c.primary }]]}
            onPress={() => setAdjustUnit('hours')}
          >
            <Text style={[styles.unitBtnText, { color: c.textMuted }, adjustUnit === 'hours' && styles.unitBtnTextSelected]}>hr</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.adjustBtn, styles.addBtn, extending && styles.btnDisabled]}
          onPress={() => applyAdjustment(1)}
          disabled={extending}
        >
          <Clock size={16} color="#fff" />
          <Text style={styles.adjustBtnText}>+ Add</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.adjustBtn, styles.subtractBtn, extending && styles.btnDisabled]}
          onPress={() => applyAdjustment(-1)}
          disabled={extending}
        >
          <Text style={styles.adjustBtnText}>− Subtract</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.row}>
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
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fcd34d'
  },
  label: { fontSize: 12, fontWeight: '700', color: '#92400e', marginBottom: 8 },
  adjustRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  amountInput: {
    width: 52,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 15,
    color: '#1e293b',
    backgroundColor: '#fff'
  },
  unitRow: { flexDirection: 'row', gap: 4 },
  unitBtn: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#e2e8f0' },
  unitBtnSelected: { backgroundColor: '#22c55e' },
  unitBtnText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  unitBtnTextSelected: { color: '#fff' },
  adjustBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  addBtn: { backgroundColor: '#22c55e' },
  subtractBtn: { backgroundColor: '#0ea5e9' },
  adjustBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  closePollBtn: { backgroundColor: '#0ea5e9' },
  cancelBtn: { backgroundColor: '#dc2626' },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '600' }
})
