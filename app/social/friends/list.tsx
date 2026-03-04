'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput } from 'react-native'
import { useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { UserPlus, Search, Tag } from 'lucide-react-native'
import { useThemeColors } from '@/hooks/useTheme'
import { useSocialAuth } from '@/hooks/useSocialAuth'
import { supabase } from '@/lib/supabase'
import { FriendListItem } from '@/components/social/friends/FriendListItem'
import type { FriendWithDetails } from '@/types/social'

function mapRpcRowToFriend (row: { friend_id: string; username: string; friend_code: string | null; status: string; categories: unknown; created_at: string }): FriendWithDetails {
  return {
    friend_id: row.friend_id,
    username: row.username,
    friend_code: row.friend_code,
    status: row.status as FriendWithDetails['status'],
    categories: Array.isArray(row.categories) ? row.categories as FriendWithDetails['categories'] : [],
    created_at: row.created_at
  }
}

export default function FriendsListScreen () {
  const router = useRouter()
  const colors = useThemeColors()
  const { profile, isAuthenticated, loading: authLoading } = useSocialAuth()
  const [friends, setFriends] = useState<FriendWithDetails[]>([])
  const [filteredFriends, setFilteredFriends] = useState<FriendWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted'>('all')
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const searchQueryRef = useRef(searchQuery)
  const filterRef = useRef(filter)
  searchQueryRef.current = searchQuery
  filterRef.current = filter

  const applyFilterAndSearch = useCallback(
    (data: FriendWithDetails[], query: string, statusFilter: 'all' | 'pending' | 'accepted') => {
      let filtered = data
      if (statusFilter === 'pending') {
        filtered = filtered.filter((f) => f.status === 'pending')
      } else if (statusFilter === 'accepted') {
        filtered = filtered.filter((f) => f.status === 'accepted')
      }
      if (query.trim()) {
        const q = query.toLowerCase().trim()
        filtered = filtered.filter(
          (f) =>
            f.username.toLowerCase().includes(q) ||
            (f.friend_code?.toLowerCase().includes(q) ?? false)
        )
      }
      setFilteredFriends(filtered)
    },
    []
  )

  const loadFriends = useCallback(async () => {
    if (!isAuthenticated) {
      setFriends([])
      setFilteredFriends([])
      setLoading(false)
      setRefreshing(false)
      setLoadError(null)
      return
    }

    setLoadError(null)
    try {
      const { data, error } = await supabase.rpc('get_my_friends')

      if (__DEV__) {
        console.log('[Friends] get_my_friends result:', error ? { error: error.message } : { count: (data ?? []).length, first: (data ?? [])[0] })
      }

      if (error) {
        setLoadError(error.message || 'Failed to load friends')
        setFriends([])
        setFilteredFriends([])
      } else {
        const list = ((data ?? []) as Array<{ friend_id: string; username: string; friend_code: string | null; status: string; categories: unknown; created_at: string }>).map(mapRpcRowToFriend)
        setFriends(list)
        applyFilterAndSearch(list, searchQueryRef.current, filterRef.current)
      }
    } catch (err) {
      setLoadError('An unexpected error occurred')
      setFriends([])
      setFilteredFriends([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [isAuthenticated, profile?.id, applyFilterAndSearch])

  useEffect(() => {
    applyFilterAndSearch(friends, searchQuery, filter)
  }, [searchQuery, filter, friends, applyFilterAndSearch])

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) {
      router.replace('/social/login')
      return
    }
    void loadFriends()
  }, [authLoading, isAuthenticated, loadFriends, router])

  useFocusEffect(
    useCallback(() => {
      if (!authLoading && isAuthenticated) void loadFriends()
    }, [authLoading, isAuthenticated, loadFriends])
  )

  useEffect(() => {
    if (!profile?.id || !isAuthenticated) return
    const channel = supabase
      .channel('friendships-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => {
        void loadFriends()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.id, isAuthenticated, loadFriends])

  const handleAccept = async (friendId: string) => {
    setActionLoadingId(friendId)
    try {
      const { error } = await supabase.rpc('update_friend_status', { p_friend_id: friendId, p_status: 'accepted' })
      if (!error) void loadFriends()
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleDeny = async (friendId: string) => {
    setActionLoadingId(friendId)
    try {
      const { error } = await supabase.rpc('remove_friend', { p_friend_id: friendId })
      if (!error) void loadFriends()
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleRemove = async (friendId: string) => {
    setActionLoadingId(friendId)
    try {
      const { error } = await supabase.rpc('remove_friend', { p_friend_id: friendId })
      if (!error) void loadFriends()
    } finally {
      setActionLoadingId(null)
    }
  }

  const onRefresh = () => {
    setRefreshing(true)
    void loadFriends()
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
        <Text style={[styles.title, { color: colors.text }]}>Friends</Text>
        {profile?.friend_code ? (
          <Text style={[styles.friendCode, { color: colors.textMuted }]}>Your code: {profile.friend_code}</Text>
        ) : null}
      </View>

      {loadError ? (
        <View style={[styles.errorBanner, { backgroundColor: colors.destructive + '18', borderColor: colors.destructive }]}>
          <Text style={[styles.errorText, { color: colors.destructive }]}>{loadError}</Text>
          <TouchableOpacity onPress={() => void loadFriends()} style={[styles.retryButton, { backgroundColor: colors.destructive }]}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Search size={20} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search friends..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={colors.placeholder}
        />
      </View>

      <View style={styles.filterContainer}>
        {(['all', 'pending', 'accepted'] as const).map((filterType) => (
          <TouchableOpacity
            key={filterType}
            style={[
              styles.filterChip,
              { backgroundColor: colors.border },
              filter === filterType && [styles.filterChipActive, { backgroundColor: colors.primary }]
            ]}
            onPress={() => setFilter(filterType)}
          >
            <Text style={[styles.filterChipText, { color: colors.textMuted }, filter === filterType && styles.filterChipTextActive]}>
              {filterType === 'all' ? 'All' : filterType === 'pending' ? 'Pending' : 'Friends'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && !refreshing ? (
        <View style={[styles.centered, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredFriends}
          keyExtractor={(item) => item.friend_id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {searchQuery || filter !== 'all' ? 'No friends match your search' : 'No friends yet'}
              </Text>
              {!searchQuery && filter === 'all' ? (
                <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                  Add friends using their friend code or accept pending requests
                </Text>
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <FriendListItem
              friend={item}
              onAccept={item.status === 'pending' ? () => handleAccept(item.friend_id) : undefined}
              onDeny={item.status === 'pending' ? () => handleDeny(item.friend_id) : undefined}
              onRemove={item.status === 'accepted' ? () => handleRemove(item.friend_id) : undefined}
              actionLoading={actionLoadingId === item.friend_id}
              themeColors={colors}
            />
          )}
        />
      )}

      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TouchableOpacity style={[styles.fabSecondary, { backgroundColor: colors.secondaryBg }]} onPress={() => router.push('/social/add-friend')}>
          <UserPlus size={22} color={colors.primary} />
          <Text style={[styles.fabSecondaryText, { color: colors.primary }]}>Add by code</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.fabSecondary, { backgroundColor: colors.secondaryBg }]} onPress={() => router.push('/social/friends/categories')}>
          <Tag size={22} color={colors.primary} />
          <Text style={[styles.fabSecondaryText, { color: colors.primary }]}>Categories</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }]} onPress={() => router.push('/social/friends/create-group')}>
          <Text style={styles.fabText}>New group from friends</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#fff', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 24, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  friendCode: { fontSize: 14, color: '#64748b' },
  errorBanner: {
    backgroundColor: '#fef2f2',
    padding: 12,
    margin: 16,
    marginTop: 0,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  errorText: { fontSize: 14, color: '#dc2626', fontWeight: '500', flex: 1 },
  retryButton: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#dc2626', borderRadius: 6 },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: '#1e293b' },
  filterContainer: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12, gap: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#e2e8f0' },
  filterChipActive: { backgroundColor: '#22c55e' },
  filterChipText: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  filterChipTextActive: { color: '#fff' },
  list: { padding: 16, paddingBottom: 140 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: '#64748b', marginBottom: 8, textAlign: 'center' },
  emptySubtext: { fontSize: 14, color: '#94a3b8', textAlign: 'center', maxWidth: 300 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0'
  },
  fabSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#f0fdf4'
  },
  fabSecondaryText: { color: '#22c55e', fontWeight: '600', fontSize: 14 },
  fab: { flex: 1, backgroundColor: '#22c55e', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  fabText: { color: '#fff', fontWeight: '600', fontSize: 15 }
})
