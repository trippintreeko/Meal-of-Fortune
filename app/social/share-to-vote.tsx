'use client'

import { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Share2, Users } from 'lucide-react-native'
import { useThemeColors } from '@/hooks/useTheme'
import { useSocialAuth } from '@/hooks/useSocialAuth'
import { useCalendarStore } from '@/store/calendar-store'
import { supabase } from '@/lib/supabase'
import { suggestionTextForMeal } from '@/lib/suggestion-text-for-meal'
import type { MealGroup } from '@/types/social'
import type { SavedMeal } from '@/types/calendar'

export default function ShareToVoteScreen () {
  const router = useRouter()
  const { shareIds } = useLocalSearchParams<{ shareIds?: string }>()
  const { isAuthenticated, loading: authLoading } = useSocialAuth()
  const getSavedMeal = useCalendarStore((s) => s.getSavedMeal)
  const [groupsWithVote, setGroupsWithVote] = useState<MealGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const mealIds = shareIds ? shareIds.split(',').map((id) => id.trim()).filter(Boolean) : []
  const meals = mealIds.map((id) => getSavedMeal(id)).filter(Boolean) as SavedMeal[]
  const colors = useThemeColors()

  const loadGroups = useCallback(async () => {
    if (!isAuthenticated) return
    const { data, error } = await supabase.rpc('get_my_groups')
    if (error || !data?.length) {
      setGroupsWithVote([])
      setLoading(false)
      return
    }
    const groups = (data as MealGroup[]).filter((g) => g.active_voting_session)
    setGroupsWithVote(groups)
    setLoading(false)
  }, [isAuthenticated])

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) {
      router.replace('/social/login')
      return
    }
    if (mealIds.length === 0) {
      setLoading(false)
      return
    }
    void loadGroups()
  }, [authLoading, isAuthenticated, mealIds.length, loadGroups, router])

  const shareToGroup = async (group: MealGroup) => {
    const sessionId = group.active_voting_session
    if (!sessionId || meals.length === 0) return
    setSubmitting(true)
    let added = 0
    let err: string | null = null
    for (const meal of meals) {
      const text = suggestionTextForMeal(meal)
      const { error } = await supabase.rpc('add_meal_suggestion', {
        p_session_id: sessionId,
        p_suggestion_text: text
      })
      if (error) err = error.message
      else added += 1
    }
    setSubmitting(false)
    if (err && added === 0) {
      Alert.alert('Error', err)
      return
    }
    Alert.alert(
      'Shared',
      added === meals.length
        ? `Added ${added} meal${added === 1 ? '' : 's'} to "${group.name}" vote.`
        : `Added ${added} of ${meals.length} meals. ${err ?? ''}`,
      [{ text: 'OK', onPress: () => router.replace('/social/groups') }]
    )
  }

  if (authLoading || !isAuthenticated) return null
  if (mealIds.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.message, { color: colors.textMuted }]}>No meals selected. Pick meals from "Meals I want" on the home page, then tap Share for votes.</Text>
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
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

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Share2 size={32} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>Share for votes</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {meals.length} meal{meals.length === 1 ? '' : 's'} from Meals I want. Choose a group with an active vote to add them.
        </Text>
      </View>
      {groupsWithVote.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No active vote right now.</Text>
          <Text style={[styles.emptyHint, { color: colors.textMuted }]}>Open My groups, open a group, and start a vote. Then come back here to share.</Text>
          <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={() => router.replace('/social/groups')}>
            <Text style={styles.buttonText}>My groups</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.list}>
          {groupsWithVote.map((g) => (
            <TouchableOpacity
              key={g.id}
              style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              onPress={() => shareToGroup(g)}
              disabled={submitting}
            >
              <Users size={24} color={colors.primary} />
              <View style={styles.groupInfo}>
                <Text style={[styles.groupName, { color: colors.text }]}>{g.name}</Text>
                <Text style={[styles.groupMeta, { color: colors.textMuted }]}>Active vote — tap to add {meals.length} meal{meals.length === 1 ? '' : 's'}</Text>
              </View>
              {submitting ? <ActivityIndicator size="small" color={colors.primary} /> : null}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 22, fontWeight: '700', color: '#1e293b', marginTop: 12 },
  subtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 8 },
  message: { fontSize: 15, color: '#64748b', textAlign: 'center', marginBottom: 20 },
  empty: { alignItems: 'center' },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#475569', marginBottom: 8 },
  emptyHint: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 20 },
  list: { gap: 12 },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  groupInfo: { flex: 1 },
  groupName: { fontSize: 17, fontWeight: '600', color: '#1e293b' },
  groupMeta: { fontSize: 13, color: '#64748b', marginTop: 2 },
  button: { backgroundColor: '#22c55e', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' }
})
