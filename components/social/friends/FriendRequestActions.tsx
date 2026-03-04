'use client'

import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'

type FriendRequestActionsProps = {
  onAccept: () => void
  onDeny: () => void
  loading?: boolean
}

export function FriendRequestActions ({ onAccept, onDeny, loading }: FriendRequestActionsProps) {
  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[styles.button, styles.accept]}
        onPress={onAccept}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Accept</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, styles.deny]}
        onPress={onDeny}
        disabled={loading}
      >
        <Text style={styles.denyText}>Deny</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, marginTop: 8 },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center'
  },
  accept: { backgroundColor: '#22c55e' },
  deny: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  denyText: { color: '#64748b', fontWeight: '600', fontSize: 14 }
})
