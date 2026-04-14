'use client'

import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native'
import { Check } from 'lucide-react-native'
import type { FriendWithDetails } from '@/types/social'
import { getDisplayUsername } from '@/lib/username-display'
import { useThemeColors } from '@/hooks/useTheme'

type MultiSelectFriendsProps = {
  friends: FriendWithDetails[]
  selectedIds: Set<string>
  onToggle: (friendId: string) => void
  emptyMessage?: string
}

export function MultiSelectFriends ({ friends, selectedIds, onToggle, emptyMessage = 'No friends to add.' }: MultiSelectFriendsProps) {
  const colors = useThemeColors()
  const accepted = friends.filter((f) => f.status === 'accepted')
  if (accepted.length === 0) {
    return <Text style={[styles.empty, { color: colors.textMuted }]}>{emptyMessage}</Text>
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
            style={[
              styles.row,
              { backgroundColor: colors.card, borderColor: selected ? colors.primary : 'transparent' },
              selected && { backgroundColor: colors.secondaryBg }
            ]}
            onPress={() => onToggle(item.friend_id)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.checkbox,
                { borderColor: selected ? colors.primary : colors.border },
                selected && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}
            >
              {selected ? <Check size={18} color={colors.primaryText} /> : null}
            </View>
            <Text style={[styles.name, { color: colors.text }]}>{getDisplayUsername(item.username)}</Text>
            {item.friend_code ? (
              <Text style={[styles.code, { color: colors.textMuted }]}>{item.friend_code}</Text>
            ) : null}
          </TouchableOpacity>
        )
      }}
    />
  )
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 20, paddingBottom: 24 },
  empty: { textAlign: 'center', fontSize: 15, marginTop: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  name: { flex: 1, fontSize: 16, fontWeight: '600' },
  code: { fontSize: 12 }
})
