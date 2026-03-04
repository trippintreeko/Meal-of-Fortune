'use client'

import { useCallback, useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSocialAuth } from '@/hooks/useSocialAuth'
import { getAvatarFoodAssetSource } from '@/lib/avatar-food-asset'
import { supabase } from '@/lib/supabase'
import type { FriendWithDetails, FriendCategory } from '@/types/social'
import { CategoryChip } from '@/components/social/friends/CategoryChip'

export default function FriendProfileScreen () {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { profile, isAuthenticated, loading: authLoading } = useSocialAuth()
  const [friend, setFriend] = useState<FriendWithDetails | null>(null)
  const [allCategories, setAllCategories] = useState<Array<FriendCategory & { id: string }>>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const load = useCallback(async () => {
    if (!id || !profile?.id || !isAuthenticated) {
      setLoading(false)
      return
    }
    const [friendsRes, categoriesRes] = await Promise.all([
      supabase.rpc('get_my_friends'),
      supabase.from('friend_categories').select('id, name, color').eq('user_id', profile.id).order('name')
    ])
    if (friendsRes.error) {
      setFriend(null)
      setLoading(false)
      return
    }
    const list = (friendsRes.data ?? []).map((row: { friend_id: string; username: string; friend_code: string | null; status: string; categories: FriendCategory[]; created_at: string }) => ({
      friend_id: row.friend_id,
      username: row.username,
      friend_code: row.friend_code,
      status: row.status as FriendWithDetails['status'],
      categories: Array.isArray(row.categories) ? row.categories : [],
      created_at: row.created_at
    })) as FriendWithDetails[]
    const found = list.find((f) => f.friend_id === id) ?? null
    setFriend(found)
    setAllCategories((categoriesRes.data ?? []) as Array<FriendCategory & { id: string }>)
    setLoading(false)
  }, [id, profile?.id, isAuthenticated])

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) {
      router.replace('/social/login')
      return
    }
    void load()
  }, [authLoading, isAuthenticated, load, router])

  const toggleCategory = async (categoryId: string) => {
    if (!profile?.id || !id) return
    const inCategory = friend?.categories?.some((c) => c.id === categoryId)
    setActionLoading(true)
    if (inCategory) {
      await supabase
        .from('friend_category_memberships')
        .delete()
        .eq('user_id', profile.id)
        .eq('friend_id', id)
        .eq('category_id', categoryId)
    } else {
      await supabase.from('friend_category_memberships').insert({
        user_id: profile.id,
        friend_id: id,
        category_id: categoryId
      })
    }
    await load()
    setActionLoading(false)
  }

  const removeFriend = () => {
    Alert.alert('Remove friend', 'Remove this person from your friends list?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true)
          await supabase.rpc('remove_friend', { p_friend_id: id })
          setActionLoading(false)
          router.back()
        }
      }
    ])
  }

  if (authLoading || !isAuthenticated) return null
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    )
  }
  if (!friend) {
    return (
      <View style={styles.centered}>
        <Text style={styles.empty}>Friend not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Image source={getAvatarFoodAssetSource(id ?? '')} style={styles.avatarImage} resizeMode="cover" />
        </View>
        <Text style={styles.name}>{friend.username}</Text>
        {friend.friend_code ? <Text style={styles.code}>{friend.friend_code}</Text> : null}
        <View style={[styles.badge, friend.status === 'pending' ? styles.badgePending : styles.badgeAccepted]}>
          <Text style={[styles.badgeText, friend.status === 'pending' ? styles.badgeTextPending : styles.badgeTextAccepted]}>
            {friend.status === 'pending' ? 'Pending' : 'Friend'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Categories</Text>
        <Text style={styles.sectionHint}>Add or remove labels for this friend.</Text>
        {allCategories.map((cat) => {
          const inCategory = friend.categories?.some((c) => c.id === cat.id)
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryRow, inCategory && styles.categoryRowSelected]}
              onPress={() => toggleCategory(cat.id)}
              disabled={actionLoading}
            >
              <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
              <Text style={styles.categoryName}>{cat.name}</Text>
              {inCategory ? <Text style={styles.categoryCheck}>✓</Text> : null}
            </TouchableOpacity>
          )
        })}
        {allCategories.length === 0 ? (
          <Text style={styles.noCats}>Create categories from the Categories screen first.</Text>
        ) : null}
      </View>

      {friend.status === 'accepted' ? (
        <TouchableOpacity style={styles.removeBtn} onPress={removeFriend} disabled={actionLoading}>
          <Text style={styles.removeBtnText}>Remove friend</Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20, paddingBottom: 40 },
  empty: { color: '#64748b', fontSize: 16 },
  backBtn: { marginTop: 16, paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#22c55e', borderRadius: 10 },
  backBtnText: { color: '#fff', fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 24, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  avatar: { width: 80, height: 80, borderRadius: 40, overflow: 'hidden', marginBottom: 12 },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  name: { fontSize: 22, fontWeight: '700', color: '#1e293b' },
  code: { fontSize: 14, color: '#64748b', marginTop: 4 },
  badge: { marginTop: 10, paddingVertical: 4, paddingHorizontal: 12, borderRadius: 8 },
  badgePending: { backgroundColor: '#fef3c7' },
  badgeAccepted: { backgroundColor: '#dcfce7' },
  badgeText: { fontSize: 13, fontWeight: '600' },
  badgeTextPending: { color: '#b45309' },
  badgeTextAccepted: { color: '#16a34a' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  sectionHint: { fontSize: 14, color: '#64748b', marginBottom: 12 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  categoryRowSelected: { backgroundColor: '#f0fdf4', borderColor: '#22c55e' },
  categoryDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  categoryName: { flex: 1, fontSize: 16, color: '#1e293b' },
  categoryCheck: { color: '#22c55e', fontWeight: '700' },
  noCats: { fontSize: 14, color: '#94a3b8' },
  removeBtn: { paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: '#fef2f2' },
  removeBtnText: { color: '#dc2626', fontWeight: '600', fontSize: 16 }
})
