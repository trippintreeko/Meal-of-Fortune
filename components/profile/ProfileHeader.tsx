import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native'
import { Camera, Copy, ChevronRight } from 'lucide-react-native'
import type { ThemeColors } from '@/lib/theme-colors'
import { getAvatarFoodAssetSource, getAvatarFoodAssetSourceByKey, getFoodAvatarKey } from '@/lib/avatar-food-asset'
import { getDisplayUsername } from '@/lib/username-display'

type ProfileHeaderProps = {
  avatarUri?: string | null
  /** When no avatarUri, use this seed (e.g. auth_id) to show a food-asset avatar. */
  avatarSeed?: string | null
  username: string
  friendCode?: string | null
  groupsCount?: number
  friendsCount?: number
  uploading?: boolean
  onEditAvatar?: () => void
  onEditUsername?: () => void
  onCopyFriendCode?: () => void
  themeColors?: ThemeColors
}

export default function ProfileHeader ({
  avatarUri,
  avatarSeed,
  username,
  friendCode,
  groupsCount = 0,
  friendsCount = 0,
  uploading = false,
  onEditAvatar,
  onEditUsername,
  onCopyFriendCode,
  themeColors: c
}: ProfileHeaderProps) {
  const handleCopy = () => {
    if (friendCode) onCopyFriendCode?.()
  }

  return (
    <View style={[styles.container, c && { backgroundColor: c.card, borderBottomColor: c.border }]}>
      <TouchableOpacity
        style={styles.avatarWrap}
        onPress={onEditAvatar}
        disabled={!onEditAvatar}
        activeOpacity={onEditAvatar ? 0.8 : 1}>
        {getFoodAvatarKey(avatarUri) ? (
          <Image source={getAvatarFoodAssetSourceByKey(getFoodAvatarKey(avatarUri)!)} style={styles.avatar} resizeMode="cover" />
        ) : avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
        ) : avatarSeed ? (
          <Image source={getAvatarFoodAssetSource(avatarSeed)} style={styles.avatar} resizeMode="cover" />
        ) : (
          <View style={[styles.avatarPlaceholder, c && { backgroundColor: c.primary }]}>
            <Text style={styles.avatarLetter}>{getDisplayUsername(username).charAt(0).toUpperCase() || '?'}</Text>
          </View>
        )}
        {uploading ? (
          <View style={[styles.editBadge, c && { backgroundColor: c.primary }]}>
            <ActivityIndicator size="small" color="#ffffff" />
          </View>
        ) : onEditAvatar ? (
          <View style={[styles.editBadge, c && { backgroundColor: c.primary }]}>
            <Camera size={14} color="#ffffff" />
          </View>
        ) : null}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.nameRow}
        onPress={onEditUsername}
        disabled={!onEditUsername}
        activeOpacity={onEditUsername ? 0.7 : 1}>
        <Text style={[styles.username, c && { color: c.text }]}>{getDisplayUsername(username)}</Text>
        {onEditUsername ? <ChevronRight size={20} color={c?.textMuted ?? '#94a3b8'} /> : null}
      </TouchableOpacity>

      {friendCode ? (
        <TouchableOpacity style={styles.friendCodeRow} onPress={handleCopy} activeOpacity={0.7} accessibilityLabel="Copy friend code">
          <Text style={[styles.friendCodeLabel, c && { color: c.textMuted }]}>Friend code</Text>
          <View style={styles.friendCodeValueWrap}>
            <Text style={[styles.friendCodeValue, c && { color: c.text }]}>{friendCode}</Text>
            <Copy size={16} color={c?.primary ?? '#22c55e'} />
          </View>
        </TouchableOpacity>
      ) : null}

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, c && { color: c.text }]}>{groupsCount}</Text>
          <Text style={[styles.statLabel, c && { color: c.textMuted }]}>Groups</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, c && { color: c.text }]}>{friendsCount}</Text>
          <Text style={[styles.statLabel, c && { color: c.textMuted }]}>Friends</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 12
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: 'hidden'
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarLetter: {
    fontSize: 36,
    fontWeight: '700',
    color: '#ffffff'
  },
  editBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center'
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8
  },
  username: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b'
  },
  friendCodeRow: {
    marginBottom: 16
  },
  friendCodeLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2
  },
  friendCodeValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  friendCodeValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b'
  },
  stats: {
    flexDirection: 'row',
    gap: 32
  },
  stat: {
    alignItems: 'center'
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b'
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2
  }
})
