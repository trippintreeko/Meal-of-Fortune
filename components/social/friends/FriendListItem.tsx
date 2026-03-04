'use client'

import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native'
import { useRouter } from 'expo-router'
import type { ThemeColors } from '@/lib/theme-colors'
import type { FriendWithDetails } from '@/types/social'
import { CategoryChip } from './CategoryChip'
import { FriendRequestActions } from './FriendRequestActions'
import { LIGHT_COLORS } from '@/lib/theme-colors'
import { getAvatarFoodAssetSource } from '@/lib/avatar-food-asset'

type FriendListItemProps = {
  friend: FriendWithDetails
  onAccept?: () => void
  onDeny?: () => void
  onRemove?: () => void
  actionLoading?: boolean
  showCategories?: boolean
  themeColors?: ThemeColors
}

export function FriendListItem ({
  friend,
  onAccept,
  onDeny,
  onRemove,
  actionLoading,
  showCategories = true,
  themeColors = LIGHT_COLORS
}: FriendListItemProps) {
  const router = useRouter()
  const c = themeColors
  const isPending = friend.status === 'pending'

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
      <TouchableOpacity
        style={styles.mainRow}
        onPress={() => router.push({ pathname: '/social/friends/profile/[id]', params: { id: friend.friend_id } })}
      >
        <View style={[styles.avatar, { overflow: 'hidden' }]}>
          <Image source={getAvatarFoodAssetSource(friend.friend_id)} style={styles.avatarImage} resizeMode="cover" />
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: c.text }]}>{friend.username}</Text>
          {friend.friend_code ? <Text style={[styles.code, { color: c.textMuted }]}>{friend.friend_code}</Text> : null}
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.badge,
                isPending ? [styles.badgePending, { backgroundColor: c.secondaryBg }] : [styles.badgeAccepted, { backgroundColor: c.primary + '30' }]
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  isPending ? { color: c.textMuted } : { color: c.primary }
                ]}
              >
                {isPending ? 'Pending' : 'Friend'}
              </Text>
            </View>
          </View>
          {showCategories && friend.categories?.length > 0 ? (
            <View style={styles.categories}>
              {friend.categories.map((cat) => (
                <CategoryChip key={cat.id} category={cat} />
              ))}
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
      {isPending && (onAccept || onDeny) ? (
        <FriendRequestActions onAccept={onAccept ?? (() => {})} onDeny={onDeny ?? (() => {})} loading={actionLoading} />
      ) : null}
      {!isPending && onRemove ? (
        <TouchableOpacity style={styles.removeFriend} onPress={onRemove}>
          <Text style={[styles.removeFriendText, { color: c.destructive }]}>Remove friend</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  mainRow: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22
  },
  info: { flex: 1 },
  name: { fontSize: 17, fontWeight: '600' },
  code: { fontSize: 12, marginTop: 2 },
  badgeRow: { flexDirection: 'row', marginTop: 6 },
  badge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 6 },
  badgePending: {},
  badgeAccepted: {},
  badgeText: { fontSize: 12, fontWeight: '600' },
  badgeTextPending: {},
  badgeTextAccepted: {},
  categories: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  removeFriend: { marginTop: 10, paddingVertical: 6 },
  removeFriendText: { fontSize: 14, color: '#dc2626', fontWeight: '500' }
})

export default FriendListItem
