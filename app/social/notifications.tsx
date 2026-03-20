'use client'

import { useCallback, useEffect, useState } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { Swipeable } from 'react-native-gesture-handler'
import { Trash2 } from 'lucide-react-native'
import { useThemeColors } from '@/hooks/useTheme'
import { useSocialAuth } from '@/hooks/useSocialAuth'
import { supabase } from '@/lib/supabase'
import type { Notification } from '@/types/social'

export default function NotificationsScreen () {
  const colors = useThemeColors()
  const router = useRouter()
  const { profile, isAuthenticated } = useSocialAuth()
  const [list, setList] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [respondingId, setRespondingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchList = useCallback(() => {
    if (!profile?.id) return
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setList((data as Notification[]) ?? [])
      })
  }, [profile?.id])

  useEffect(() => {
    if (!isAuthenticated || !profile?.id) {
      setLoading(false)
      return
    }
    fetchList()
    setLoading(false)
  }, [isAuthenticated, profile?.id, fetchList])

  const markRead = async (id: string) => {
    if (!profile?.id) return
    await supabase.from('notifications').update({ read: true }).eq('id', id).eq('user_id', profile.id)
    setList((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const respondToJoinRequest = async (requestId: string, accept: boolean) => {
    if (respondingId) return
    setRespondingId(requestId)
    const { error } = await supabase.rpc('respond_to_join_request', {
      p_request_id: requestId,
      p_accept: accept
    })
    setRespondingId(null)
    if (error) {
      return
    }
    setList((prev) => prev.filter((n) => (n.data as { request_id?: string })?.request_id !== requestId))
  }

  const deleteNotification = async (item: Notification) => {
    const requestId = (item.data as { request_id?: string })?.request_id as string | undefined
    const isJoinRequest = item.type === 'group_join_request'
    if (deletingId || !profile?.id) return
    setDeletingId(item.id)
    if (isJoinRequest && requestId) {
      await supabase.rpc('respond_to_join_request', { p_request_id: requestId, p_accept: false })
    } else {
      await supabase.from('notifications').delete().eq('id', item.id).eq('user_id', profile.id)
    }
    setList((prev) => prev.filter((n) => n.id !== item.id))
    setDeletingId(null)
  }

  if (!isAuthenticated) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.empty, { color: colors.textMuted }]}>Sign in to see notifications.</Text>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  const isJoinRequest = (item: Notification) => item.type === 'group_join_request'
  const getRequestId = (item: Notification) => (item.data as { request_id?: string })?.request_id as string | undefined
  const getGroupId = (item: Notification) => (item.data as { group_id?: string })?.group_id as string | undefined

  return (
    <FlatList
      data={list}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[styles.list, { backgroundColor: colors.background }]}
      ListEmptyComponent={<Text style={[styles.empty, { color: colors.textMuted }]}>No notifications yet.</Text>}
      renderItem={({ item }) => {
        const requestId = getRequestId(item)
        const groupId = getGroupId(item)
        const isJoin = isJoinRequest(item)
        const responding = requestId && respondingId === requestId
        const isDeleting = deletingId === item.id

        const card = (
          <TouchableOpacity
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
              !item.read && { backgroundColor: colors.secondaryBg, borderColor: colors.primary }
            ]}
            onPress={() => !isJoin && markRead(item.id)}
            disabled={isJoin}
          >
            <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
            <Text style={[styles.body, { color: colors.textMuted }]}>{item.body}</Text>
            <Text style={[styles.time, { color: colors.textMuted }]}>{new Date(item.created_at).toLocaleString()}</Text>
            {isJoin && requestId && (
              <View style={styles.joinRequestActions}>
                <TouchableOpacity
                  style={[styles.joinRequestBtn, styles.acceptBtn, { backgroundColor: colors.primary }]}
                  onPress={() => respondToJoinRequest(requestId, true)}
                  disabled={!!responding}
                >
                  {responding ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.joinRequestBtnText}>Accept</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.joinRequestBtn, styles.denyBtn, { backgroundColor: colors.destructive }]}
                  onPress={() => respondToJoinRequest(requestId, false)}
                  disabled={!!responding}
                >
                  <Text style={styles.joinRequestBtnText}>Deny</Text>
                </TouchableOpacity>
                {groupId ? (
                  <TouchableOpacity
                    style={[styles.joinRequestBtn, { borderWidth: 1, borderColor: colors.border }]}
                    onPress={() => router.push({ pathname: '/social/group/[id]', params: { id: groupId } })}
                    disabled={!!responding}
                  >
                    <Text style={[styles.joinRequestBtnText, { color: colors.text }]}>View group</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
          </TouchableOpacity>
        )

        return (
          <Swipeable
            renderRightActions={() => (
              <TouchableOpacity
                style={[styles.deleteAction, { backgroundColor: colors.destructive }]}
                onPress={() => deleteNotification(item)}
                disabled={!!isDeleting}
                activeOpacity={0.8}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Trash2 size={24} color="#fff" />
                    <Text style={styles.deleteActionText}>Delete</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            friction={2}
            rightThreshold={40}
          >
            {card}
          </Swipeable>
        )
      }}
    />
  )
}

const styles = StyleSheet.create({
  list: { padding: 20, flexGrow: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { textAlign: 'center', color: '#94a3b8', fontSize: 15 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  cardUnread: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  title: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  body: { fontSize: 14, color: '#64748b', marginTop: 4 },
  time: { fontSize: 12, color: '#94a3b8', marginTop: 8 },
  joinRequestActions: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  joinRequestBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, minWidth: 72, alignItems: 'center' },
  acceptBtn: {},
  denyBtn: {},
  joinRequestBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 12,
    marginBottom: 12
  },
  deleteActionText: { color: '#fff', fontSize: 12, fontWeight: '600', marginTop: 4 }
})
