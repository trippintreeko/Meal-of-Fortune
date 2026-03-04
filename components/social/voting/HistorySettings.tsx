'use client'

/* FEATURE DISABLED – Voting History Calendar. Used by GroupVotingHistory; re-enable in app/social/group/[id].tsx. See docs/VOTING-HISTORY-CALENDAR-CHANGES.md */

import { useState } from 'react'
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator } from 'react-native'
import { X } from 'lucide-react-native'

const PRESETS = [
  { label: '1 month', days: 30 },
  { label: '3 months', days: 90 },
  { label: '6 months', days: 180 },
  { label: '1 year', days: 365 }
] as const

type HistorySettingsProps = {
  visible: boolean
  groupId: string
  groupName: string
  currentRetentionDays: number
  onSave: (retentionDays: number) => Promise<void>
  onClose: () => void
}

export default function HistorySettings ({
  visible,
  groupName,
  currentRetentionDays,
  onSave,
  onClose
}: HistorySettingsProps) {
  const [saving, setSaving] = useState(false)
  const [selectedDays, setSelectedDays] = useState(currentRetentionDays)

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(selectedDays)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>History retention</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>
            Voting history for "{groupName}" is kept for this long. Older votes are archived and then removed.
          </Text>
          <Text style={styles.label}>Keep history for</Text>
          <View style={styles.presets}>
            {PRESETS.map(({ label, days }) => (
              <TouchableOpacity
                key={days}
                style={[styles.presetBtn, selectedDays === days && styles.presetBtnSelected]}
                onPress={() => setSelectedDays(days)}
              >
                <Text style={[styles.presetText, selectedDays === days && styles.presetTextSelected]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.hint}>Current: {currentRetentionDays} days. Max: 365 days.</Text>
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
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
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 32,
    maxHeight: '90%'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  title: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  closeBtn: { padding: 4 },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 12 },
  label: { fontSize: 14, fontWeight: '600', color: '#475569', marginTop: 16, marginBottom: 8 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  presetBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#f1f5f9'
  },
  presetBtnSelected: { backgroundColor: '#22c55e' },
  presetText: { fontSize: 15, color: '#475569', fontWeight: '600' },
  presetTextSelected: { color: '#fff' },
  hint: { fontSize: 12, color: '#94a3b8', marginTop: 12 },
  saveBtn: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' }
})
