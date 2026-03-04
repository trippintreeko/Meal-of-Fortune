'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Modal, Pressable, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ListPlus, Check, X } from 'lucide-react-native'
import { useThemeColors } from '@/hooks/useTheme'
import { useSocialAuth } from '@/hooks/useSocialAuth'
import { useCalendarStore } from '@/store/calendar-store'
import { supabase } from '@/lib/supabase'
import { suggestionTextForMeal } from '@/lib/suggestion-text-for-meal'
import { validateAndSanitize, MAX_LENGTH } from '@/lib/sanitize-input'
import type { VotingSession, MealSuggestionWithMeta } from '@/types/social'
import SuggestionList from '@/components/social/SuggestionList'
import DeadlineCountdown from '@/components/social/voting/DeadlineCountdown'
import VotingAdminControls from '@/components/social/voting/VotingAdminControls'

export default function SessionScreen () {
  const { id: sessionId } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { profile, isAuthenticated } = useSocialAuth()
  const [session, setSession] = useState<VotingSession | null>(null)
  const [suggestions, setSuggestions] = useState<MealSuggestionWithMeta[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [suggestionText, setSuggestionText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showAddFromWantModal, setShowAddFromWantModal] = useState(false)
  const [selectedWantIds, setSelectedWantIds] = useState<Set<string>>(new Set())
  const [addFromWantSubmitting, setAddFromWantSubmitting] = useState(false)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const { savedMeals, load: loadSavedMeals, getSavedMeal } = useCalendarStore()
  const colors = useThemeColors()

  const loadSession = useCallback(async () => {
    if (!sessionId) return
    setError(null)
    const { data, error: rpcErr } = await supabase.rpc('get_session_detail', { p_session_id: sessionId })
    if (rpcErr || !data) {
      setLoading(false)
      setError(rpcErr?.message ?? 'Could not load session')
      setSession(null)
      setSuggestions([])
      return
    }
    const detail = data as {
      session: VotingSession
      is_admin?: boolean
      suggestions: Array<{
        id: string
        session_id: string
        user_id: string | null
        suggestion: string
        category: string | null
        vote_count: number
        created_at: string
        username: string | null
      }>
      votes: Array<{ user_id: string; suggestion_id: string }>
    }
    setSession(detail.session)
    setIsAdmin(detail.is_admin === true)
    if (detail.session.status !== 'active') {
      router.replace({ pathname: '/social/results/[id]', params: { id: sessionId } })
      setLoading(false)
      return
    }
    const voteByUser = new Map(detail.votes.map((v) => [v.user_id, v.suggestion_id]))
    const myId = profile?.id
    setSuggestions(
      (detail.suggestions ?? []).map((x) => ({
        ...x,
        username: x.username ?? undefined,
        user_voted: myId ? voteByUser.get(myId) === x.id : false
      })) as MealSuggestionWithMeta[]
    )
    setLoading(false)
  }, [sessionId, profile?.id, router])

  useEffect(() => {
    if (!sessionId || !isAuthenticated) return
    loadSession()
  }, [sessionId, isAuthenticated])

  const finalizeIfDeadlinePassed = useCallback(async () => {
    if (!sessionId) return
    const { data, error: rpcErr } = await supabase.rpc('finalize_voting_if_deadline_passed', { p_session_id: sessionId })
    if (!rpcErr && data === true) void loadSession()
  }, [sessionId])

  useEffect(() => {
    if (!session || session.status !== 'active') return
    if (new Date(session.deadline).getTime() <= Date.now()) void finalizeIfDeadlinePassed()
  }, [session?.id, session?.status, session?.deadline, finalizeIfDeadlinePassed])

  useEffect(() => {
    if (!sessionId) return
    const channel = supabase
      .channel(`session-${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meal_suggestions', filter: `session_id=eq.${sessionId}` },
        () => { void loadSession() }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'votes', filter: `session_id=eq.${sessionId}` },
        () => { void loadSession() }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'voting_sessions', filter: `id=eq.${sessionId}` },
        () => { void loadSession() }
      )
      .on('broadcast', { event: 'refresh' }, () => { void loadSession() })
      .subscribe()
    channelRef.current = channel
    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [sessionId, loadSession])

  const castVote = async (suggestionId: string) => {
    const { error: rpcErr } = await supabase.rpc('set_my_vote', {
      p_session_id: sessionId,
      p_suggestion_id: suggestionId
    })
    if (!rpcErr) void loadSession()
  }

  const addSuggestion = async () => {
    const result = validateAndSanitize(suggestionText, {
      fieldName: 'Suggestion',
      maxLength: MAX_LENGTH.suggestionText,
      allowNewlines: false,
      disallowDangerous: true
    })
    if (!result.sanitized) return
    if (!result.ok) {
      setError(result.error)
      return
    }
    setSubmitting(true)
    setError(null)
    const { error: rpcErr } = await supabase.rpc('add_meal_suggestion', {
      p_session_id: sessionId,
      p_suggestion_text: result.sanitized
    })
    setSubmitting(false)
    if (!rpcErr) {
      setSuggestionText('')
      void loadSession()
    }
  }

  const removeSuggestion = async (suggestionId: string) => {
    const { error: rpcErr } = await supabase.rpc('remove_meal_suggestion', {
      p_suggestion_id: suggestionId
    })
    if (!rpcErr) {
      void loadSession()
      channelRef.current?.send({ type: 'broadcast', event: 'refresh', payload: {} })
    }
  }

  const openAddFromWantModal = useCallback(() => {
    setSelectedWantIds(new Set())
    setShowAddFromWantModal(true)
    void loadSavedMeals()
  }, [loadSavedMeals])

  const toggleWantMeal = useCallback((id: string) => {
    setSelectedWantIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAllWantMeals = useCallback(() => {
    setSelectedWantIds(new Set(savedMeals.map((m) => m.id)))
  }, [savedMeals])

  const addSelectedFromWant = useCallback(async () => {
    if (!sessionId || selectedWantIds.size === 0) return
    setAddFromWantSubmitting(true)
    let added = 0
    let err: string | null = null
    for (const id of selectedWantIds) {
      const meal = getSavedMeal(id)
      if (!meal) continue
      const text = suggestionTextForMeal(meal)
      const { error } = await supabase.rpc('add_meal_suggestion', {
        p_session_id: sessionId,
        p_suggestion_text: text
      })
      if (error) err = error.message
      else added += 1
    }
    setAddFromWantSubmitting(false)
    setShowAddFromWantModal(false)
    setSelectedWantIds(new Set())
    void loadSession()
    if (err && added === 0) {
      Alert.alert('Error', err)
    } else if (added > 0) {
      channelRef.current?.send({ type: 'broadcast', event: 'refresh', payload: {} })
    }
  }, [sessionId, selectedWantIds, getSavedMeal, loadSession])

  if (loading && !session) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  if (error || !session) {
    return (
      <View style={[styles.centered, styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textMuted }]}>{error ?? 'Session not found'}</Text>
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={() => loadSession()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const ended = session.status !== 'active'

  const extendDeadline = async (sid: string, newDeadline: string) => {
    const { error: rpcErr } = await supabase.rpc('extend_voting_deadline', {
      p_session_id: sid,
      p_new_deadline: newDeadline
    })
    if (rpcErr) throw new Error(rpcErr.message)
  }

  const cancelVotingSession = async (sid: string) => {
    const { error: rpcErr } = await supabase.rpc('cancel_voting_session', { p_session_id: sid })
    if (rpcErr) throw new Error(rpcErr.message)
    router.back()
  }

  const completeVotingSession = async (sid: string) => {
    const { error: rpcErr } = await supabase.rpc('complete_voting_session', { p_session_id: sid })
    if (rpcErr) throw new Error(rpcErr.message)
  }

  const handleClosePoll = () => {
    void loadSession()
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <DeadlineCountdown
          deadline={session.deadline}
          ended={ended}
          onDeadlineReached={!ended ? finalizeIfDeadlinePassed : undefined}
        />
      </View>
      {isAdmin && !ended && (
        <VotingAdminControls
          sessionId={sessionId!}
          currentDeadline={session.deadline}
          onExtendDeadline={() => void loadSession()}
          onCancel={() => {}}
          onClosePoll={handleClosePoll}
          extendDeadline={extendDeadline}
          cancelVotingSession={cancelVotingSession}
          completeVotingSession={completeVotingSession}
          themeColors={colors}
        />
      )}
      {session.description ? (
        <View style={[styles.descCard, { backgroundColor: colors.secondaryBg }]}>
          <Text style={[styles.descText, { color: colors.textMuted }]}>{session.description}</Text>
        </View>
      ) : null}
      {!ended && (
        <View style={[styles.addCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <TextInput
            style={[styles.input, { borderColor: colors.inputBorder, backgroundColor: colors.inputBg, color: colors.text }]}
            value={suggestionText}
            onChangeText={setSuggestionText}
            placeholder="Suggest a meal or restaurant..."
            placeholderTextColor={colors.placeholder}
          />
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }, submitting && styles.addBtnDisabled]}
            onPress={addSuggestion}
            disabled={submitting || !suggestionText.trim()}
          >
            {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.addBtnText}>Add suggestion</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addFromWantBtn, { borderColor: colors.secondary, backgroundColor: colors.secondaryBg }]}
            onPress={openAddFromWantModal}
          >
            <ListPlus size={20} color={colors.secondary} />
            <Text style={[styles.addFromWantBtnText, { color: colors.secondary }]}>Add from Meals I want</Text>
          </TouchableOpacity>
        </View>
      )}
      <Modal
        visible={showAddFromWantModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddFromWantModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowAddFromWantModal(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add from Meals I want</Text>
              <TouchableOpacity onPress={() => setShowAddFromWantModal(false)} hitSlop={12}>
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            {savedMeals.length === 0 ? (
              <Text style={[styles.modalEmpty, { color: colors.textMuted }]}>No meals in your list. Add meals from the home page (Minigame, Feelings, or Food gallery).</Text>
            ) : (
              <>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalSelectAll} onPress={selectAllWantMeals}>
                    <Text style={[styles.modalSelectAllText, { color: colors.secondary }]}>Select all</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalAddBtn, { backgroundColor: colors.secondary }, (selectedWantIds.size === 0 || addFromWantSubmitting) && styles.modalAddBtnDisabled]}
                    onPress={() => void addSelectedFromWant()}
                    disabled={selectedWantIds.size === 0 || addFromWantSubmitting}
                  >
                    {addFromWantSubmitting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.modalAddBtnText}>{selectedWantIds.size > 0 ? `Add ${selectedWantIds.size} to vote` : 'Add to vote'}</Text>
                    )}
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
                  {savedMeals.map((meal) => {
                    const selected = selectedWantIds.has(meal.id)
                    const subtitle = meal.seasonings?.length
                      ? meal.seasonings.slice(0, 4).join(', ') + (meal.seasonings.length > 4 ? '…' : '')
                      : ''
                    return (
                      <Pressable
                        key={meal.id}
                        style={[
                          styles.modalRow,
                          { borderColor: colors.border },
                          selected && { borderColor: colors.secondary, backgroundColor: colors.secondaryBg }
                        ]}
                        onPress={() => toggleWantMeal(meal.id)}
                      >
                        <View style={[styles.modalRowCheck, selected && { backgroundColor: colors.secondary, borderColor: colors.secondary }]}>
                          {selected && <Check size={16} color="#fff" />}
                        </View>
                        <View style={styles.modalRowText}>
                          <Text style={[styles.modalRowTitle, { color: colors.text }]} numberOfLines={1}>{meal.title}</Text>
                          {subtitle ? <Text style={[styles.modalRowSubtitle, { color: colors.textMuted }]} numberOfLines={1}>{subtitle}</Text> : null}
                        </View>
                      </Pressable>
                    )
                  })}
                </ScrollView>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
      <SuggestionList
        suggestions={suggestions}
        currentUserId={profile?.id ?? null}
        onVote={castVote}
        isAdmin={isAdmin && !ended}
        onRemoveSuggestion={isAdmin && !ended ? removeSuggestion : undefined}
        themeColors={colors}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  descCard: { backgroundColor: '#f1f5f9', borderRadius: 10, padding: 12, marginBottom: 16 },
  descText: { fontSize: 14, color: '#475569' },
  addCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, fontSize: 15, color: '#1e293b', marginBottom: 12 },
  addBtn: { backgroundColor: '#22c55e', borderRadius: 10, padding: 12, alignItems: 'center' },
  addBtnDisabled: { opacity: 0.7 },
  addBtnText: { color: '#fff', fontWeight: '600' },
  addFromWantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#6366f1',
    backgroundColor: '#f5f3ff'
  },
  addFromWantBtnText: { fontSize: 15, fontWeight: '600', color: '#6366f1' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end'
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 24
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  modalEmpty: { padding: 24, fontSize: 15, color: '#64748b', textAlign: 'center' },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12
  },
  modalSelectAll: { paddingVertical: 8, paddingRight: 8 },
  modalSelectAllText: { fontSize: 15, color: '#6366f1', fontWeight: '600' },
  modalAddBtn: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 140,
    alignItems: 'center'
  },
  modalAddBtnDisabled: { opacity: 0.6 },
  modalAddBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  modalList: { maxHeight: 320, paddingHorizontal: 16 },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  modalRowSelected: { borderColor: '#6366f1', backgroundColor: '#f5f3ff' },
  modalRowCheck: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#c7d2fe',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalRowCheckSelected: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  modalRowText: { flex: 1 },
  modalRowTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  modalRowSubtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  errorContainer: { padding: 20 },
  errorText: { fontSize: 16, color: '#64748b', textAlign: 'center', marginBottom: 16 },
  retryButton: { backgroundColor: '#22c55e', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' }
})
