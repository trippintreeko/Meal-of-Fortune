'use client'

import { useCallback, useEffect, useState } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, Alert } from 'react-native'
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
  const [confirmClearOpen, setConfirmClearOpen] = useState(false)
  const [clearingAll, setClearingAll] = useState(false)

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

  const confirmClearAllNotifications = async () => {
    if (!profile?.id || clearingAll) return
    setClearingAll(true)
    const { error } = await supabase.from('notifications').delete().eq('user_id', profile.id)
    setClearingAll(false)
    setConfirmClearOpen(false)
    if (error) {
      Alert.alert('Could not clear', error.message)
      return
    }
    setList([])
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
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {list.length > 0 ? (
        <View style={[styles.toolbar, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.clearAllBtn, { borderColor: colors.destructive }]}
            onPress={() => setConfirmClearOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Clear all notifications"
          >
            <Text style={[styles.clearAllBtnText, { color: colors.destructive }]}>Clear all</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, list.length === 0 && styles.listEmptyGrow]}
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
      <Modal
        visible={confirmClearOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!clearingAll) setConfirmClearOpen(false)
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Clear all notifications?</Text>
            <Text style={[styles.modalBody, { color: colors.textMuted }]}>
              This removes every notification from your inbox. Pending join requests disappear here; you can still manage the request from the group screen if needed.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSecondary, { backgroundColor: colors.secondaryBg }]}
                onPress={() => setConfirmClearOpen(false)}
                disabled={clearingAll}
                accessibilityRole="button"
                accessibilityLabel="Cancel clear all"
              >
                <Text style={[styles.modalBtnSecondaryText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.destructive }]}
                onPress={confirmClearAllNotifications}
                disabled={clearingAll}
                accessibilityRole="button"
                accessibilityLabel="Confirm clear all notifications"
              >
                {clearingAll ? (
                  <ActivityIndicator size="small" color={colors.primaryText} />
                ) : (
                  <Text style={[styles.modalBtnDangerText, { color: colors.primaryText }]}>Clear all</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  clearAllBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1
  },
  clearAllBtnText: { fontSize: 14, fontWeight: '600' },
  list: { padding: 20, flexGrow: 1 },
  listEmptyGrow: { flexGrow: 1 },
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
  deleteActionText: { color: '#fff', fontSize: 12, fontWeight: '600', marginTop: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24
  },
  modalCard: { borderRadius: 16, padding: 22 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  modalBody: { fontSize: 15, lineHeight: 22, marginBottom: 22 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalBtnSecondary: {},
  modalBtnSecondaryText: { fontSize: 16, fontWeight: '600' },
  modalBtnDangerText: { fontSize: 16, fontWeight: '600' }
})
