'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { PartyPopper, CalendarPlus, Calendar } from 'lucide-react-native'
import { useThemeColors } from '@/hooks/useTheme'
import { supabase } from '@/lib/supabase'
import { useCalendarStore } from '@/store/calendar-store'
import type { VotingSession } from '@/types/social'
import type { MealSlot, SavedMeal } from '@/types/calendar'
import ScheduleGroupMealModal from '@/components/social/voting/ScheduleGroupMealModal'
import VotingResultsStats from '@/components/social/voting/VotingResultsStats'
import type { SuggestionStat } from '@/components/social/voting/VotingResultsStats'
import AddToCalendarModal from '@/components/calendar/AddToCalendarModal'
import OrbitalSpinWheel from '@/components/OrbitalSpinWheel'

type VotingStats = {
  total_participants: number
  total_votes: number
  winner_suggestion_id: string | null
  tiebreaker_used?: boolean
  suggestions: SuggestionStat[]
}

export default function ResultsScreen () {
  const { id: sessionId } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const colors = useThemeColors()
  const [session, setSession] = useState<VotingSession | null>(null)
  const [stats, setStats] = useState<VotingStats | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [scheduleGroupModalVisible, setScheduleGroupModalVisible] = useState(false)
  const [addToCalendarSuggestion, setAddToCalendarSuggestion] = useState<SuggestionStat | null>(null)
  const [suggestedForMe, setSuggestedForMe] = useState<Array<{
    id: string
    scheduled_date: string
    meal_slot: string
    status: string
    suggestion_text: string
  }>>([])
  const addVotedMeal = useCalendarStore((s) => s.addVotedMeal)
  const loadCalendar = useCalendarStore((s) => s.load)

  const loadResults = async () => {
    if (!sessionId) return
    setLoading(true)
    const [sessionRes, statsRes] = await Promise.all([
      supabase.rpc('get_session_detail', { p_session_id: sessionId }),
      supabase.rpc('get_voting_statistics', { p_session_id: sessionId })
    ])
    if (sessionRes.data) {
      const detail = sessionRes.data as {
        session: VotingSession
        is_admin?: boolean
        suggestions: Array<{ id: string; suggestion: string; vote_count: number; username: string | null }>
      }
      setSession(detail.session)
      setIsAdmin(detail.is_admin === true)
    }
    if (statsRes.data) {
      setStats(statsRes.data as VotingStats)
    }
    const acceptRes = await supabase.rpc('get_member_schedule_acceptance', { p_session_id: sessionId })
    setSuggestedForMe(Array.isArray(acceptRes.data) ? acceptRes.data : [])
    setLoading(false)
  }

  useEffect(() => {
    if (!sessionId) return
    void loadResults()
  }, [sessionId])

  const scheduleGroupMeals = async (params: {
    sessionId: string
    scheduleData: Array<{ date: string; slot: MealSlot; suggestion_id: string }>
    sendAsSuggestion: boolean
    notifyMembers: boolean
  }) => {
    const { error } = await supabase.rpc('schedule_group_meals', {
      p_session_id: params.sessionId,
      p_schedule_data: params.scheduleData,
      p_send_as_suggestion: params.sendAsSuggestion,
      p_notify_members: params.notifyMembers
    })
    if (error) throw new Error(error.message)
  }

  const handleAcceptSuggested = async (sgmId: string) => {
    const { data, error } = await supabase.rpc('accept_suggested_meal', {
      p_scheduled_group_meal_id: sgmId
    })
    if (error) throw new Error(error.message)
    const d = data as { scheduled_date: string; meal_slot: MealSlot; suggestion_text: string; suggestion_id: string; voting_session_id: string }
    await loadCalendar()
    await addVotedMeal(
      {
        date: d.scheduled_date,
        mealSlot: d.meal_slot as MealSlot,
        savedMealId: null,
        title: d.suggestion_text
      },
      {
        votingSessionId: d.voting_session_id,
        originalSuggestionId: d.suggestion_id,
        isWinner: false,
        scheduledByAdmin: true,
        isSuggestedEvent: true,
        scheduledGroupMealId: sgmId
      }
    )
    void loadResults()
  }

  const handleDeclineSuggested = async (sgmId: string) => {
    const { error } = await supabase.rpc('decline_suggested_meal', {
      p_scheduled_group_meal_id: sgmId
    })
    if (error) throw new Error(error.message)
    void loadResults()
  }

  const handleAddSuggestionToCalendar = async (date: string, slot: MealSlot) => {
    if (!sessionId || !addToCalendarSuggestion) return
    await loadCalendar()
    await addVotedMeal(
      {
        date,
        mealSlot: slot,
        savedMealId: null,
        title: addToCalendarSuggestion.suggestion_text
      },
      {
        votingSessionId: sessionId,
        originalSuggestionId: addToCalendarSuggestion.suggestion_id,
        isWinner: addToCalendarSuggestion.suggestion_id === stats?.winner_suggestion_id,
        voteCount: addToCalendarSuggestion.vote_count,
        totalVoters: stats?.total_votes,
        suggestedBy: addToCalendarSuggestion.suggested_by_username ?? undefined
      }
    )
    setAddToCalendarSuggestion(null)
  }

  const tiebreakerData = useMemo(() => {
    if (!stats?.winner_suggestion_id || !stats.suggestions?.length) return null
    const maxVotes = Math.max(0, ...stats.suggestions.map((s) => s.vote_count))
    const tied = stats.suggestions
      .filter((s) => s.vote_count === maxVotes)
      .sort((a, b) => a.suggestion_id.localeCompare(b.suggestion_id))
    if (tied.length < 2 || maxVotes === 0) return null
    const winnerIndex = tied.findIndex((s) => s.suggestion_id === stats.winner_suggestion_id)
    if (winnerIndex < 0) return null
    const tiedMeals: SavedMeal[] = tied.map((s) => ({
      id: s.suggestion_id,
      title: s.suggestion_text,
      baseId: '',
      proteinId: '',
      vegetableId: '',
      method: '',
      createdAt: 0
    }))
    const n = tiedMeals.length
    const floorPanels = 6
    const multiplier = n > floorPanels ? 1 : Math.floor(floorPanels / n) + 1 // smallest k where n*k > floorPanels
    const wheelMeals = Array.from({ length: multiplier }, () => tiedMeals).flat()
    const wheelWinnerIndex = wheelMeals.findIndex((m) => m.id === tiedMeals[winnerIndex].id)
    if (wheelWinnerIndex < 0) return null
    return { tiedMeals, wheelMeals, winnerIndex, wheelWinnerIndex }
  }, [stats?.winner_suggestion_id, stats?.suggestions])

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  const winnerText = stats?.suggestions?.find(
    (s) => s.suggestion_id === stats.winner_suggestion_id
  )?.suggestion_text ?? null
  const hasWinner = !!winnerText
  const alreadyScheduled =
    session?.scheduled_meal_date != null && session?.scheduled_meal_slot != null

  const groupChoseText = tiebreakerData
    ? (() => {
        const titles = tiebreakerData.tiedMeals.map((m) => m.title)
        if (titles.length === 1) return titles[0]
        if (titles.length === 2) return titles.join(' and ')
        return titles.slice(0, -1).join(', ') + ', and ' + titles[titles.length - 1]
      })()
    : winnerText

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}>
      <PartyPopper size={64} color={colors.primary} />
      <Text style={[styles.title, { color: colors.text }]}>Voting result</Text>
      {tiebreakerData && (
        <Text style={[styles.tiebreakerSubtitle, { color: colors.textMuted }]}>
          It was a tie! The wheel chose the winner.
        </Text>
      )}
      {groupChoseText ? (
        <View style={[styles.winnerCard, { backgroundColor: colors.primary + '30', borderColor: colors.primary }]}>
          <Text style={[styles.winnerLabel, { color: colors.primary }]}>The group chose</Text>
          <Text style={[styles.winnerText, { color: colors.text }]}>{groupChoseText}</Text>
        </View>
      ) : (
        <Text style={[styles.noWinner, { color: colors.textMuted }]}>No votes were cast.</Text>
      )}

      {tiebreakerData && (
        <View style={styles.tiebreakerSection}>
          <OrbitalSpinWheel
            meals={tiebreakerData.wheelMeals}
            onSpinComplete={() => {}}
            themeColors={colors}
            tiebreakerWinnerIndex={tiebreakerData.wheelWinnerIndex}
          />
          <Text style={[styles.tiebreakerLanded, { color: colors.text }]}>
            The wheel landed on: {tiebreakerData.tiedMeals[tiebreakerData.winnerIndex].title}
          </Text>
        </View>
      )}

      {stats && (
        <View style={styles.statsSection}>
          <VotingResultsStats
            totalParticipants={stats.total_participants}
            totalVotes={stats.total_votes}
            suggestions={stats.suggestions}
            winnerSuggestionId={stats.winner_suggestion_id}
            themeColors={colors}
          />
          <Text style={[styles.addToCalendarSectionTitle, { color: colors.textMuted }]}>Add to my calendar</Text>
          {stats.suggestions.map((s) => (
            <View key={s.suggestion_id} style={[styles.suggestionRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.suggestionRowText, { color: colors.text }]} numberOfLines={1}>{s.suggestion_text}</Text>
              <TouchableOpacity
                style={[styles.addToMyCalendarBtn, { backgroundColor: colors.primary + '30' }]}
                onPress={() => setAddToCalendarSuggestion(s)}>
                <Calendar size={18} color={colors.primary} />
                <Text style={[styles.addToMyCalendarBtnText, { color: colors.primary }]}>Add</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {suggestedForMe.filter((s) => s.status === 'pending').length > 0 && (
        <View style={styles.suggestedSection}>
          <Text style={[styles.suggestedSectionTitle, { color: colors.textMuted }]}>Suggested for you</Text>
          {suggestedForMe
            .filter((s) => s.status === 'pending')
            .map((s) => (
              <View key={s.id} style={[styles.suggestedRow, { backgroundColor: colors.secondaryBg, borderColor: colors.cardBorder }]}>
                <View style={styles.suggestedRowText}>
                  <Text style={[styles.suggestedRowTitle, { color: colors.text }]} numberOfLines={1}>{s.suggestion_text}</Text>
                  <Text style={[styles.suggestedRowMeta, { color: colors.textMuted }]}>
                    {s.scheduled_date} · {s.meal_slot}
                  </Text>
                </View>
                <View style={styles.suggestedActions}>
                  <TouchableOpacity
                    style={[styles.acceptBtn, { backgroundColor: colors.primary }]}
                    onPress={() => handleAcceptSuggested(s.id)}>
                    <Text style={styles.acceptBtnText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.declineBtn, { backgroundColor: colors.card }]}
                    onPress={() => handleDeclineSuggested(s.id)}>
                    <Text style={[styles.declineBtnText, { color: colors.textMuted }]}>Decline</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
        </View>
      )}

      {isAdmin && hasWinner && !alreadyScheduled && (
        <TouchableOpacity
          style={[styles.scheduleBtn, { backgroundColor: colors.primary }]}
          onPress={() => setScheduleGroupModalVisible(true)}>
          <CalendarPlus size={22} color="#fff" />
          <Text style={styles.scheduleBtnText}>Schedule meal for group</Text>
        </TouchableOpacity>
      )}
      {alreadyScheduled && (
        <Text style={[styles.scheduledText, { color: colors.textMuted }]}>
          Scheduled for {session?.scheduled_meal_date} ({session?.scheduled_meal_slot})
        </Text>
      )}
      <Text style={[styles.backLink, { color: colors.primary }]} onPress={() => router.back()}>
        Back to group
      </Text>

      {sessionId && stats?.winner_suggestion_id && isAdmin && (
        <ScheduleGroupMealModal
          visible={scheduleGroupModalVisible}
          sessionId={sessionId}
          suggestionId={stats.winner_suggestion_id}
          suggestionTitle={winnerText ?? ''}
          onClose={() => setScheduleGroupModalVisible(false)}
          onScheduled={() => {
            setScheduleGroupModalVisible(false)
            void loadResults()
          }}
          scheduleGroupMeals={scheduleGroupMeals}
        />
      )}

      {addToCalendarSuggestion && (
        <AddToCalendarModal
          visible={!!addToCalendarSuggestion}
          mealTitle={addToCalendarSuggestion.suggestion_text}
          confirmLabel="Add to my calendar"
          onClose={() => setAddToCalendarSuggestion(null)}
          onConfirm={handleAddSuggestionToCalendar}
        />
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f8fafc' },
  container: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 48
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#1e293b', marginTop: 16, textAlign: 'center' },
  tiebreakerSubtitle: { fontSize: 14, marginTop: 8, textAlign: 'center' },
  tiebreakerSection: { marginTop: 24, alignItems: 'center', maxHeight: 220 },
  tiebreakerLanded: { marginTop: 12, fontSize: 15, fontWeight: '600', textAlign: 'center' },
  winnerCard: {
    marginTop: 24,
    backgroundColor: '#dcfce7',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bbf7d0'
  },
  winnerLabel: { fontSize: 14, color: '#166534', fontWeight: '600' },
  winnerText: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginTop: 8 },
  noWinner: { marginTop: 24, fontSize: 16, color: '#64748b', textAlign: 'center' },
  statsSection: { width: '100%', marginTop: 24 },
  addToCalendarSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 10,
    marginTop: 8
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  suggestionRowText: { flex: 1, fontSize: 15, color: '#1e293b', marginRight: 12 },
  addToMyCalendarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f0fdf4'
  },
  addToMyCalendarBtnText: { fontSize: 14, fontWeight: '600', color: '#22c55e' },
  suggestedSection: { width: '100%', marginTop: 24 },
  suggestedSectionTitle: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 10 },
  suggestedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fef3c7',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#fcd34d'
  },
  suggestedRowText: { flex: 1, marginRight: 12 },
  suggestedRowTitle: { fontSize: 15, color: '#1e293b', fontWeight: '600' },
  suggestedRowMeta: { fontSize: 12, color: '#64748b', marginTop: 2 },
  suggestedActions: { flexDirection: 'row', gap: 8 },
  acceptBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#22c55e' },
  acceptBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  declineBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#f1f5f9' },
  declineBtnText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  scheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 24
  },
  scheduleBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  scheduledText: { marginTop: 16, fontSize: 14, color: '#64748b', textAlign: 'center' },
  backLink: { marginTop: 32, fontSize: 16, color: '#22c55e', fontWeight: '600', textAlign: 'center' }
})
