'use client'

import { useCallback, useEffect, useState } from 'react'
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useSocialAuth } from '@/hooks/useSocialAuth'
import { useThemeColors } from '@/hooks/useTheme'
import { supabase } from '@/lib/supabase'
import type { FriendWithDetails } from '@/types/social'
import { validateAndSanitize, MAX_LENGTH } from '@/lib/sanitize-input'
import { MultiSelectFriends } from '@/components/social/friends/MultiSelectFriends'

export default function CreateGroupFromFriendsScreen () {
  const colors = useThemeColors()
  const router = useRouter()
  const { isAuthenticated, loading: authLoading } = useSocialAuth()
  const [friends, setFriends] = useState<FriendWithDetails[]>([])
  const [groupName, setGroupName] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const loadFriends = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }
    const { data, error } = await supabase.rpc('get_my_friends')
    if (error) {
      setFriends([])
      setLoading(false)
      return
    }
    const list = (data ?? []).map((row: { friend_id: string; username: string; friend_code: string | null; status: string; categories: FriendWithDetails['categories']; created_at: string }) => ({
      friend_id: row.friend_id,
      username: row.username,
      friend_code: row.friend_code,
      status: row.status as FriendWithDetails['status'],
      categories: Array.isArray(row.categories) ? row.categories : [],
      created_at: row.created_at
    })) as FriendWithDetails[]
    setFriends(list)
    setLoading(false)
  }, [isAuthenticated])

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) {
      router.replace('/social/login')
      return
    }
    void loadFriends()
  }, [authLoading, isAuthenticated, loadFriends, router])

  const toggle = (friendId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(friendId)) next.delete(friendId)
      else next.add(friendId)
      return next
    })
  }

  const create = async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) {
      Alert.alert('Select friends', 'Choose at least one friend to add to the group.')
      return
    }
    const nameResult = validateAndSanitize(groupName, {
      fieldName: 'Group name',
      maxLength: MAX_LENGTH.groupName,
      allowNewlines: false,
      disallowDangerous: true
    })
    if (!nameResult.ok) {
      Alert.alert('Invalid', nameResult.error)
      return
    }
    const name = nameResult.sanitized || 'New Group'
    setCreating(true)
    const { data: groupId, error } = await supabase.rpc('create_group_from_friends', {
      p_group_name: name,
      p_friend_ids: ids
    })
    setCreating(false)
    if (error) {
      Alert.alert('Error', error.message)
      return
    }
    router.replace('/social/groups')
    router.push({ pathname: '/social/group/[id]', params: { id: groupId as string } })
  }

  if (authLoading || !isAuthenticated) return null

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.hint, { color: colors.textMuted }]}>
        Choose friends to add to a new meal group. They will be notified and added as members.
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.inputBg,
            borderColor: colors.inputBorder,
            color: colors.text
          }
        ]}
        placeholder="Group name"
        placeholderTextColor={colors.placeholder}
        value={groupName}
        onChangeText={setGroupName}
      />
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <MultiSelectFriends friends={friends} selectedIds={selectedIds} onToggle={toggle} />
      )}
      <TouchableOpacity
        style={[
          styles.createBtn,
          { backgroundColor: colors.primary },
          (creating || selectedIds.size === 0) && styles.createBtnDisabled
        ]}
        onPress={create}
        disabled={creating || selectedIds.size === 0}
      >
        {creating ? (
          <ActivityIndicator size="small" color={colors.primaryText} />
        ) : (
          <Text style={[styles.createBtnText, { color: colors.primaryText }]}>
            Create group ({selectedIds.size} selected)
          </Text>
        )}
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hint: { fontSize: 14, paddingHorizontal: 20, paddingVertical: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginHorizontal: 20,
    marginBottom: 16
  },
  createBtn: {
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center'
  },
  createBtnDisabled: { opacity: 0.6 },
  createBtnText: { fontWeight: '600', fontSize: 16 }
})
