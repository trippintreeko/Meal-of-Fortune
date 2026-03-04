'use client'

/* FEATURE DISABLED – Voting History Calendar. Not imported; re-enable in app/social/group/[id].tsx. See docs/VOTING-HISTORY-CALENDAR-CHANGES.md */

import { useState, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from 'react-native'
import { useRouter } from 'expo-router'
import { Calendar, ClipboardList, ChevronRight, Trophy, XCircle } from 'lucide-react-native'
import { supabase } from '@/lib/supabase'
import type { SessionStatus } from '@/types/social'
import HistorySettings from './HistorySettings'

type VotingHistoryEntry = {
  id: string
  group_id: string
  status: SessionStatus
  deadline: string
  decided_at: string | null
  winner_suggestion_id: string | null
  description: string | null
  scheduled_meal_date: string | null
  scheduled_meal_slot: string | null
  created_at: string
  winner_text: string | null
  winner_suggested_by: string | null
  total_voters: number
  total_votes: number
  total_suggestions: number
}

type GroupVotingHistoryProps = {
  groupId: string
  groupName: string
  retentionDays: number
  isAdmin: boolean
  onRetentionSaved?: () => void
}

type HistoryResponse = {
  total_count: number
  sessions: VotingHistoryEntry[]
}

export default function GroupVotingHistory ({
  groupId,
  groupName,
  retentionDays,
  isAdmin,
  onRetentionSaved
}: GroupVotingHistoryProps) {
  const router = useRouter()
  const [sessions, setSessions] = useState<VotingHistoryEntry[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [fromDate, setFromDate] = useState<string | null>(null)
  const [toDate, setToDate] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  const loadHistory = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    const { data, error } = await supabase.rpc('get_group_voting_history', {
      p_group_id: groupId,
      p_limit: 50,
      p_offset: 0,
      p_from_date: fromDate || null,
      p_to_date: toDate || null,
      p_status: statusFilter || null
    })
    if (isRefresh) setRefreshing(false)
    else setLoading(false)
    if (error) return
    const res = data as HistoryResponse
    setSessions(res?.sessions ?? [])
    setTotalCount(Number(res?.total_count) ?? 0)
  }, [groupId, fromDate, toDate, statusFilter])

  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  const openResults = (sessionId: string) => {
    router.push({ pathname: '/social/results/[id]', params: { id: sessionId } })
  }

  const displayDate = (entry: VotingHistoryEntry) => {
    const d = entry.decided_at || entry.created_at
    if (!d) return '—'
    return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {isAdmin && (
        <TouchableOpacity style={styles.settingsRow} onPress={() => setShowSettings(true)}>
          <Calendar size={18} color="#64748b" />
          <Text style={styles.settingsLabel}>History kept for {retentionDays} days</Text>
          <ChevronRight size={18} color="#94a3b8" />
        </TouchableOpacity>
      )}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void loadHistory(true)} colors={['#22c55e']} />
        }
      >
        {sessions.length === 0 ? (
          <View style={styles.empty}>
            <ClipboardList size={48} color="#94a3b8" />
            <Text style={styles.emptyTitle}>No voting history yet</Text>
            <Text style={styles.emptySub}>
              {fromDate || toDate || statusFilter
                ? 'No matches for the current filters.'
                : 'Past votes will appear here after they end.'}
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.countLabel}>{totalCount} past vote{totalCount !== 1 ? 's' : ''}</Text>
            {sessions.map((entry) => (
              <TouchableOpacity
                key={entry.id}
                style={styles.card}
                onPress={() => openResults(entry.id)}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.badge, entry.status === 'cancelled' ? styles.badgeCancelled : styles.badgeCompleted]}>
                    {entry.status === 'cancelled' ? (
                      <XCircle size={14} color="#fff" />
                    ) : (
                      <Trophy size={14} color="#fff" />
                    )}
                    <Text style={styles.badgeText}>
                      {entry.status === 'completed' ? 'Completed' : 'Cancelled'}
                    </Text>
                  </View>
                  <Text style={styles.dateText}>{displayDate(entry)}</Text>
                </View>
                {entry.description ? (
                  <Text style={styles.desc} numberOfLines={1}>{entry.description}</Text>
                ) : null}
                {entry.status === 'completed' && entry.winner_text ? (
                  <Text style={styles.winner} numberOfLines={2}>
                    Winner: {entry.winner_text}
                    {entry.winner_suggested_by ? ` (${entry.winner_suggested_by})` : ''}
                  </Text>
                ) : null}
                <View style={styles.meta}>
                  <Text style={styles.metaText}>{entry.total_voters} voters</Text>
                  <Text style={styles.metaText}> · </Text>
                  <Text style={styles.metaText}>{entry.total_suggestions} suggestions</Text>
                  {entry.scheduled_meal_date ? (
                    <>
                      <Text style={styles.metaText}> · </Text>
                      <Text style={styles.metaScheduled}>Scheduled</Text>
                    </>
                  ) : null}
                </View>
                <View style={styles.viewRow}>
                  <Text style={styles.viewDetails}>View details</Text>
                  <ChevronRight size={18} color="#22c55e" />
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
      <HistorySettings
        visible={showSettings}
        groupId={groupId}
        groupName={groupName}
        currentRetentionDays={retentionDays}
        onSave={async (days) => {
            const { error } = await supabase.rpc('update_group_voting_retention', {
              p_group_id: groupId,
              p_retention_days: days
            })
            if (error) throw new Error(error.message)
            onRetentionSaved?.()
          }}
          onClose={() => setShowSettings(false)}
        />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 200 },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    marginBottom: 12
  },
  settingsLabel: { fontSize: 14, color: '#475569', flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  countLabel: { fontSize: 13, color: '#64748b', marginBottom: 10 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8 },
  badgeCompleted: { backgroundColor: '#22c55e' },
  badgeCancelled: { backgroundColor: '#64748b' },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  dateText: { fontSize: 13, color: '#64748b' },
  desc: { fontSize: 14, color: '#475569', marginBottom: 4 },
  winner: { fontSize: 14, color: '#1e293b', fontWeight: '600', marginBottom: 6 },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 },
  metaText: { fontSize: 12, color: '#94a3b8' },
  metaScheduled: { fontSize: 12, color: '#0ea5e9', fontWeight: '600' },
  viewRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  viewDetails: { fontSize: 14, color: '#22c55e', fontWeight: '600', marginRight: 4 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#64748b', marginTop: 12 },
  emptySub: { fontSize: 14, color: '#94a3b8', marginTop: 6, textAlign: 'center' }
})
