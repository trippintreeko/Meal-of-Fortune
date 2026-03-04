'use client'

import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native'
import { Check } from 'lucide-react-native'
import type { FriendWithDetails } from '@/types/social'

type MultiSelectFriendsProps = {
  friends: FriendWithDetails[]
  selectedIds: Set<string>
  onToggle: (friendId: string) => void
  emptyMessage?: string
}

export function MultiSelectFriends ({ friends, selectedIds, onToggle, emptyMessage = 'No friends to add.' }: MultiSelectFriendsProps) {
  const accepted = friends.filter((f) => f.status === 'accepted')
  if (accepted.length === 0) {
    return <Text style={styles.empty}>{emptyMessage}</Text>
  }

  return (
    <FlatList
      data={accepted}
      keyExtractor={(item) => item.friend_id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => {
        const selected = selectedIds.has(item.friend_id)
        return (
          <TouchableOpacity
            style={[styles.row, selected && styles.rowSelected]}
            onPress={() => onToggle(item.friend_id)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
              {selected ? <Check size={18} color="#fff" /> : null}
            </View>
            <Text style={styles.name}>{item.username}</Text>
            {item.friend_code ? <Text style={styles.code}>{item.friend_code}</Text> : null}
          </TouchableOpacity>
        )
      }}
    />
  )
}

const styles = StyleSheet.create({
  list: { paddingBottom: 24 },
  empty: { textAlign: 'center', color: '#94a3b8', fontSize: 15, marginTop: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent'
  },
  rowSelected: { borderColor: '#22c55e', backgroundColor: '#f0fdf4' },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  checkboxSelected: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  name: { flex: 1, fontSize: 16, fontWeight: '600', color: '#1e293b' },
  code: { fontSize: 12, color: '#64748b' }
})
