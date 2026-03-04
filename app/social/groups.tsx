'use client'

import { useCallback, useEffect, useState } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { Users, Plus, LogOut } from 'lucide-react-native'
import { useThemeColors } from '@/hooks/useTheme'
import { useSocialAuth } from '@/hooks/useSocialAuth'
import { supabase } from '@/lib/supabase'
import type { MealGroup, VotingSession } from '@/types/social'
import VotingSessionCard from '@/components/social/VotingSessionCard'

export default function GroupsScreen () {
  const router = useRouter()
  const colors = useThemeColors()
  const { profile, isAuthenticated, signOut, loading: authLoading } = useSocialAuth()
  const [groups, setGroups] = useState<MealGroup[]>([])
  const [activeSessions, setActiveSessions] = useState<Record<string, VotingSession>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) {
      router.replace('/social/login')
      return
    }
    void loadGroups()
  }, [authLoading, isAuthenticated])

  // Refetch when screen gains focus (e.g. after creating or joining a group)
  useFocusEffect(
    useCallback(() => {
      if (!authLoading && isAuthenticated) void loadGroups()
    }, [authLoading, isAuthenticated])
  )

  async function loadGroups () {
    if (!isAuthenticated) {
      setLoading(false)
      setRefreshing(false)
      return
    }
    const { data: groupData, error } = await supabase.rpc('get_my_groups')
    if (error || !groupData?.length) {
      setGroups([])
      setActiveSessions({})
      setLoading(false)
      setRefreshing(false)
      return
    }
    setGroups((groupData as MealGroup[]) ?? [])

    const withActive = (groupData ?? []).filter((g: MealGroup) => g.active_voting_session)
    if (withActive.length > 0) {
      const { data: sessions } = await supabase
        .from('voting_sessions')
        .select('*')
        .in('id', withActive.map((g: MealGroup) => g.active_voting_session).filter(Boolean) as string[])
      const byId: Record<string, VotingSession> = {}
      for (const s of sessions ?? []) {
        byId[s.id] = s as VotingSession
      }
      setActiveSessions(byId)
    } else {
      setActiveSessions({})
    }
    setLoading(false)
    setRefreshing(false)
  }

  async function onRefresh () {
    setRefreshing(true)
    await loadGroups()
  }

  if (authLoading || !isAuthenticated) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>Meal groups</Text>
          <TouchableOpacity onPress={() => signOut()} style={styles.signOut}>
            <LogOut size={22} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
        {profile?.friend_code ? (
          <Text style={[styles.friendCode, { color: colors.textMuted }]}>Your friend code: {profile.friend_code}</Text>
        ) : null}
      </View>
      {loading ? (
        <View style={[styles.centered, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.textMuted }]}>No groups yet. Create one or join with a group code.</Text>
          }
          renderItem={({ item }) => {
            const activeSession = item.active_voting_session ? activeSessions[item.active_voting_session] : null
            return (
              <View style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <TouchableOpacity
                  style={styles.groupRow}
                  onPress={() => router.push({ pathname: '/social/group/[id]', params: { id: item.id } })}
                >
                  <Users size={24} color={colors.primary} />
                  <Text style={[styles.groupName, { color: colors.text }]}>{item.name}</Text>
                  {item.group_code ? <Text style={[styles.code, { color: colors.textMuted }]}>{item.group_code}</Text> : null}
                </TouchableOpacity>
                {activeSession ? (
                  <VotingSessionCard
                    session={activeSession}
                    groupName={item.name}
                    onPress={() => router.push({ pathname: '/social/session/[id]', params: { id: activeSession.id } })}
                  />
                ) : null}
              </View>
            )
          }}
        />
      )}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/social/join-group')}
      >
        <Plus size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 22, fontWeight: '700', color: '#1e293b' },
  signOut: { padding: 8 },
  friendCode: { fontSize: 13, color: '#64748b', marginTop: 6 },
  list: { padding: 20, paddingBottom: 100 },
  empty: { textAlign: 'center', color: '#94a3b8', fontSize: 15, marginTop: 40 },
  groupCard: { marginBottom: 20, backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  groupRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  groupName: { flex: 1, fontSize: 18, fontWeight: '600', color: '#1e293b' },
  code: { fontSize: 12, color: '#64748b' },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#22c55e', justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 }
})
