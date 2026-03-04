'use client'

import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useThemeColors } from '@/hooks/useTheme'
import { useSocialAuth } from '@/hooks/useSocialAuth'
import { supabase } from '@/lib/supabase'
import type { Notification } from '@/types/social'

export default function NotificationsScreen () {
  const colors = useThemeColors()
  const { profile, isAuthenticated } = useSocialAuth()
  const [list, setList] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated || !profile?.id) {
      setLoading(false)
      return
    }
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setList((data as Notification[]) ?? [])
        setLoading(false)
      })
  }, [isAuthenticated, profile?.id])

  const markRead = async (id: string) => {
    if (!profile?.id) return
    await supabase.from('notifications').update({ read: true }).eq('id', id).eq('user_id', profile.id)
    setList((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
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

  return (
    <FlatList
      data={list}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[styles.list, { backgroundColor: colors.background }]}
      ListEmptyComponent={<Text style={[styles.empty, { color: colors.textMuted }]}>No notifications yet.</Text>}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
            !item.read && { backgroundColor: colors.secondaryBg, borderColor: colors.primary }
          ]}
          onPress={() => markRead(item.id)}
        >
          <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
          <Text style={[styles.body, { color: colors.textMuted }]}>{item.body}</Text>
          <Text style={[styles.time, { color: colors.textMuted }]}>{new Date(item.created_at).toLocaleString()}</Text>
        </TouchableOpacity>
      )}
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
  time: { fontSize: 12, color: '#94a3b8', marginTop: 8 }
})
