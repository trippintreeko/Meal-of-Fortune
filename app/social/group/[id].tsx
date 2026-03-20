'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { Users, Play, ClipboardList } from 'lucide-react-native'
import { useThemeColors } from '@/hooks/useTheme'
import { useSocialAuth } from '@/hooks/useSocialAuth'
import { supabase } from '@/lib/supabase'
import { getDisplayUsername } from '@/lib/username-display'
import type { MealGroup, GroupMember, GroupJoinRequest } from '@/types/social'
import StartVoteModal from '@/components/social/voting/StartVoteModal'

/* Voting History Calendar: tabs and GroupVotingHistory are disabled. See docs/VOTING-HISTORY-CALENDAR-CHANGES.md.
   To re-enable: uncomment the block at the bottom of this file and restore the tab layout. */

export default function GroupDetailScreen () {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const colors = useThemeColors()
  const { profile, isAuthenticated } = useSocialAuth()
  const [group, setGroup] = useState<MealGroup | null>(null)
  const [members, setMembers] = useState<(GroupMember & { username?: string })[]>([])
  const [pendingRequests, setPendingRequests] = useState<(GroupJoinRequest & { username?: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [respondingRequestId, setRespondingRequestId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [startVoteModalVisible, setStartVoteModalVisible] = useState(false)
  const [latestCompletedSessionId, setLatestCompletedSessionId] = useState<string | null>(null)
  const [activeSessionDeadline, setActiveSessionDeadline] = useState<string | null>(null)
  const finalizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadGroup = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    const { data, error: rpcErr } = await supabase.rpc('get_group_detail', { p_group_id: id })
    setLoading(false)
    if (rpcErr || !data) {
      setError(rpcErr?.message ?? 'Could not load group')
      setGroup(null)
      setMembers([])
      setPendingRequests([])
      setLatestCompletedSessionId(null)
      setActiveSessionDeadline(null)
      return
    }
    const detail = data as {
      group: MealGroup
      members: Array<{ id: string; group_id: string; user_id: string; role: string; joined_at: string; username: string | null }>
      latest_completed_session_id: string | null
      active_session_deadline: string | null
      pending_requests?: Array<{ id: string; group_id: string; user_id: string; status: string; created_at: string; username: string | null }>
    }
    setGroup(detail.group)
    setLatestCompletedSessionId(detail.latest_completed_session_id ?? null)
    setActiveSessionDeadline(detail.active_session_deadline ?? null)
    setMembers(
      (detail.members ?? []).map((m) => ({
        ...m,
        role: m.role as GroupMember['role'],
        username: (m.username ?? 'Unknown') as string
      })) as (GroupMember & { username?: string })[]
    )
    setPendingRequests(
      (detail.pending_requests ?? []).map((r) => ({
        ...r,
        status: r.status as GroupJoinRequest['status'],
        username: (r.username ?? 'Unknown') as string
      })) as (GroupJoinRequest & { username?: string })[]
    )
  }, [id])

  useEffect(() => {
    if (!id || !isAuthenticated) return
    loadGroup()
  }, [id, isAuthenticated, loadGroup])

  useFocusEffect(
    useCallback(() => {
      if (!id || !isAuthenticated) return
      loadGroup()
    }, [id, isAuthenticated, loadGroup])
  )

  useEffect(() => {
    if (!group?.active_voting_session || !activeSessionDeadline) return
    const deadlineMs = new Date(activeSessionDeadline).getTime()
    const now = Date.now()
    const runFinalizeThenReload = async () => {
      const { data } = await supabase.rpc('finalize_voting_if_deadline_passed', { p_session_id: group.active_voting_session! })
      if (data === true) loadGroup()
    }
    if (deadlineMs <= now) {
      void runFinalizeThenReload()
      return
    }
    finalizeTimeoutRef.current = setTimeout(() => void runFinalizeThenReload(), deadlineMs - now + 500)
    return () => {
      if (finalizeTimeoutRef.current) clearTimeout(finalizeTimeoutRef.current)
    }
  }, [group?.active_voting_session, activeSessionDeadline, loadGroup])

  const startVotingSession = async (
    groupId: string,
    deadline: string,
    description?: string
  ): Promise<string | null> => {
    const { data: sessionId, error: rpcErr } = await supabase.rpc('start_voting_session', {
      p_group_id: groupId,
      p_deadline: deadline,
      p_description: description ?? null
    })
    if (rpcErr) throw new Error(rpcErr.message)
    return sessionId as string
  }

  const handleVoteStarted = useCallback(
    async (sessionId: string) => {
      setStartVoteModalVisible(false)
      await loadGroup()
      router.push({ pathname: '/social/session/[id]', params: { id: sessionId } })
    },
    [loadGroup, router]
  )

  const isLeader = group?.created_by === profile?.id
  const isAdmin = members.some((m) => m.user_id === profile?.id && m.role === 'admin')
  const canManageRequests = isLeader || isAdmin

  const handleRespondToJoinRequest = async (requestId: string, accept: boolean) => {
    if (respondingRequestId) return
    setRespondingRequestId(requestId)
    const { error } = await supabase.rpc('respond_to_join_request', {
      p_request_id: requestId,
      p_accept: accept
    })
    setRespondingRequestId(null)
    if (error) {
      Alert.alert('Error', error.message)
      return
    }
    loadGroup()
  }

  const handleAssignLeader = (memberUsername: string, newLeaderUserId: string) => {
    Alert.alert(
      'Assign new leader',
      `Make ${memberUsername} the group leader? You will become a regular member.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Assign',
          onPress: async () => {
            const { error: err } = await supabase.rpc('assign_new_leader', {
              p_group_id: group!.id,
              p_new_leader_user_id: newLeaderUserId
            })
            if (err) {
              Alert.alert('Error', err.message)
              return
            }
            loadGroup()
          }
        }
      ]
    )
  }

  const handleLeaveGroup = () => {
    Alert.alert(
      'Leave group',
      'Are you sure you want to leave this group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            const { error: err } = await supabase.rpc('leave_group', { p_group_id: group!.id })
            if (err) {
              Alert.alert('Error', err.message)
              return
            }
            router.replace('/social')
          }
        }
      ]
    )
  }

  if (loading || !group) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  const hasActiveSession = !!group.active_voting_session

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Text style={[styles.groupName, { color: colors.text }]}>{group.name}</Text>
        {group.group_code ? <Text style={[styles.code, { color: colors.textMuted }]}>Code: {group.group_code}</Text> : null}
      </View>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Members</Text>
        {members.map((m) => (
          <View key={m.id} style={styles.memberRow}>
            <Users size={18} color={colors.textMuted} />
            <Text style={[styles.memberName, { color: colors.text }]}>{getDisplayUsername(m.username)}</Text>
            {group.created_by === m.user_id ? <Text style={styles.leaderBadge}>Leader</Text> : null}
            {m.role === 'admin' && group.created_by !== m.user_id ? <Text style={[styles.role, { color: colors.primary }]}>Admin</Text> : null}
            {isLeader && m.user_id !== profile?.id && (
              <TouchableOpacity
                style={[styles.makeLeaderBtn, { backgroundColor: colors.secondaryBg }]}
                onPress={() => handleAssignLeader(getDisplayUsername(m.username) || 'this member', m.user_id)}
              >
                <Text style={[styles.makeLeaderBtnText, { color: colors.textMuted }]}>Make leader</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>
      {canManageRequests && pendingRequests.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Pending join requests</Text>
          {pendingRequests.map((req) => (
            <View key={req.id} style={styles.pendingRequestRow}>
              <Users size={18} color={colors.textMuted} />
              <Text style={[styles.memberName, { color: colors.text }]}>{getDisplayUsername(req.username)}</Text>
              <TouchableOpacity
                style={[styles.pendingRequestBtn, { backgroundColor: colors.primary }]}
                onPress={() => handleRespondToJoinRequest(req.id, true)}
                disabled={!!respondingRequestId}
              >
                {respondingRequestId === req.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.pendingRequestBtnText}>Accept</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pendingRequestBtn, styles.denyBtn, { backgroundColor: colors.destructive }]}
                onPress={() => handleRespondToJoinRequest(req.id, false)}
                disabled={!!respondingRequestId}
              >
                <Text style={styles.pendingRequestBtnText}>Deny</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
      {isAdmin && !hasActiveSession && (
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={() => setStartVoteModalVisible(true)}>
          <Play size={22} color="#fff" />
          <Text style={styles.buttonText}>Start vote</Text>
        </TouchableOpacity>
      )}
      <StartVoteModal
        visible={startVoteModalVisible}
        groupId={group.id}
        onClose={() => setStartVoteModalVisible(false)}
        onStarted={handleVoteStarted}
        startVotingSession={startVotingSession}
      />
      {hasActiveSession && (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => router.push({ pathname: '/social/session/[id]', params: { id: group.active_voting_session! } })}
        >
          <Text style={styles.buttonText}>Open active vote</Text>
        </TouchableOpacity>
      )}
      {!hasActiveSession && latestCompletedSessionId && (
        <TouchableOpacity
          style={[styles.button, styles.resultsButton]}
          onPress={() => router.push({ pathname: '/social/results/[id]', params: { id: latestCompletedSessionId } })}
        >
          <ClipboardList size={22} color="#fff" />
          <Text style={styles.buttonText}>View results of closed vote</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={styles.leaveButton} onPress={handleLeaveGroup}>
        <Text style={styles.leaveButtonText}>Leave group</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  groupName: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  code: { fontSize: 14, color: '#64748b', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#475569', marginBottom: 12 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  memberName: { flex: 1, minWidth: 80, fontSize: 15, color: '#1e293b' },
  role: { fontSize: 12, color: '#22c55e', fontWeight: '600' },
  leaderBadge: { fontSize: 12, color: '#b45309', fontWeight: '600' },
  makeLeaderBtn: { paddingVertical: 4, paddingHorizontal: 8, backgroundColor: '#f1f5f9', borderRadius: 8 },
  makeLeaderBtnText: { fontSize: 12, color: '#475569', fontWeight: '600' },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#22c55e', borderRadius: 12, padding: 16 },
  resultsButton: { backgroundColor: '#0ea5e9' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  leaveButton: { marginTop: 8, padding: 16, alignItems: 'center' },
  leaveButtonText: { fontSize: 15, color: '#dc2626', fontWeight: '600' },
  pendingRequestRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  pendingRequestBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  denyBtn: {},
  pendingRequestBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' }
})

/* ========== VOTING HISTORY CALENDAR (DISABLED) – restore when re-enabling feature ==========
   See docs/VOTING-HISTORY-CALENDAR-CHANGES.md. Add these imports:
   import { History, UserCircle } from 'lucide-react-native'
   import GroupVotingHistory from '@/components/social/voting/GroupVotingHistory'
   type TabKey = 'votes' | 'history' | 'members'

   State to add: const [activeTab, setActiveTab] = useState<TabKey>('votes')
   Derive: const retentionDays = group.voting_history_retention_days ?? 180

   Replace the return with tab layout:
   - Container: <View style={styles.container}>
   - Header: <View style={styles.headerCard}> (group name, code)
   - Tab bar: three TouchableOpacity (Votes / History / Members) with Play, History, Users icons
   - Content area: {activeTab === 'votes' && <ScrollView>...current votes content...</ScrollView>}
     {activeTab === 'history' && <GroupVotingHistory groupId={group.id} groupName={group.name} retentionDays={retentionDays} isAdmin={isAdmin} onRetentionSaved={loadGroup} />}
     {activeTab === 'members' && <ScrollView><View style={styles.card}>Members list with UserCircle icon</View></ScrollView>}

   Styles to add: headerCard, tabBar, tab, tabActive, tabText, tabTextActive, content, scroll, scrollContent
   ========== */
