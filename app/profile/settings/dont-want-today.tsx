'use client'

import { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { ChevronLeft, X } from 'lucide-react-native'
import { useThemeColors } from '@/hooks/useTheme'
import { useFoodPreferencesStore } from '@/store/food-preferences-store'
import { useSocialAuth } from '@/hooks/useSocialAuth'
import { useProfileSettings } from '@/hooks/useProfileSettings'
import { supabase } from '@/lib/supabase'

function endOfTodayISO (): string {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  d.setDate(d.getDate() + 1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

type FoodName = { id: string; name: string }

export default function DontWantTodaySettingsScreen () {
  const router = useRouter()
  const colors = useThemeColors()
  const { profile, refreshProfile } = useSocialAuth()
  const authId = profile?.auth_id ?? undefined
  const { updateProfile } = useProfileSettings(authId, profile, refreshProfile)
  const notTodayIds = useFoodPreferencesStore((s) => s.notTodayIds)
  const setNotToday = useFoodPreferencesStore((s) => s.setNotToday)
  const loadStore = useFoodPreferencesStore((s) => s.load)
  const hydrated = useFoodPreferencesStore((s) => s.hydrated)

  const [names, setNames] = useState<FoodName[]>([])
  const [loadingNames, setLoadingNames] = useState(true)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    loadStore()
  }, [loadStore])

  useEffect(() => {
    if (!hydrated) return
    if (profile?.dont_want_today && Array.isArray(profile.dont_want_today) && profile.dont_want_today.length > 0 && notTodayIds.length === 0) {
      void setNotToday(profile.dont_want_today)
    }
  }, [hydrated, profile?.auth_id, profile?.dont_want_today, notTodayIds.length, setNotToday])

  const fetchNames = useCallback(async (ids: string[]) => {
    if (ids.length === 0) {
      setNames([])
      setLoadingNames(false)
      return
    }
    setLoadingNames(true)
    const spoonIds = ids
      .map((id) => Number(id))
      .filter((n) => Number.isFinite(n))
    const { data, error } = await supabase
      .from('ingredient_assets')
      .select('spoonacular_ingredient_id, name')
      .in('spoonacular_ingredient_id', spoonIds)
    setLoadingNames(false)
    if (error) {
      setNames(ids.map((id) => ({ id, name: id })))
      return
    }
    const rows = (data ?? []) as Array<{ spoonacular_ingredient_id: number; name: string }>
    const byId = new Map(rows.map((r) => [String(r.spoonacular_ingredient_id), r.name]))
    setNames(ids.map((id) => ({ id, name: byId.get(id) ?? id })))
  }, [])

  useEffect(() => {
    fetchNames(notTodayIds)
  }, [notTodayIds, fetchNames])

  const syncToProfile = useCallback(
    async (ids: string[]) => {
      if (!authId) return
      setSyncing(true)
      await updateProfile({ dont_want_today: ids, dont_want_expires: endOfTodayISO() })
      refreshProfile()
      setSyncing(false)
    },
    [authId, updateProfile, refreshProfile]
  )

  const removeOne = async (foodId: string) => {
    const next = notTodayIds.filter((id) => id !== foodId)
    await setNotToday(next)
    await syncToProfile(next)
  }

  const clearAll = async () => {
    await setNotToday([])
    await syncToProfile([])
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} disabled={syncing} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>Don't Want Today</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Temporary exclusions reset at midnight. These match the items you marked "Not Today" in Food Preferences.
        </Text>

        <TouchableOpacity
          style={[styles.preferencesLink, { borderColor: colors.border }]}
          onPress={() => router.push('/preferences')}
        >
          <Text style={[styles.preferencesLinkText, { color: colors.primary }]}>Add or change in Food Preferences</Text>
        </TouchableOpacity>

        {notTodayIds.length > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={clearAll} disabled={syncing}>
            <Text style={styles.clearBtnText}>Clear all</Text>
          </TouchableOpacity>
        )}

        {loadingNames ? (
          <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
        ) : names.length === 0 ? (
          <Text style={[styles.hint, { color: colors.textMuted }]}>No items excluded today. Add some in Food Preferences (Not Today tab).</Text>
        ) : (
          <>
            <Text style={[styles.listTitle, { color: colors.textMuted }]}>{names.length} item(s) excluded today</Text>
            <View style={styles.list}>
              {names.map((item) => (
                <View key={item.id} style={[styles.row, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                  <TouchableOpacity
                    style={[styles.removeBtn, { backgroundColor: colors.border }]}
                    onPress={() => removeOne(item.id)}
                    disabled={syncing}
                  >
                    <X size={16} color={colors.text} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8
  },
  backBtn: { padding: 4 },
  scroll: { paddingTop: 8, paddingHorizontal: 20, paddingBottom: 40 },
  title: { flex: 1, fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 14, marginBottom: 16 },
  preferencesLink: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 16
  },
  preferencesLinkText: { fontSize: 14, fontWeight: '600' },
  clearBtn: { alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 16, backgroundColor: '#fecaca', borderRadius: 10, marginBottom: 16 },
  clearBtnText: { fontSize: 14, fontWeight: '600', color: '#dc2626' },
  loader: { marginVertical: 24 },
  hint: { fontSize: 14, marginTop: 8 },
  listTitle: { fontSize: 13, fontWeight: '600', marginBottom: 12 },
  list: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14
  },
  rowName: { flex: 1, fontSize: 16, marginRight: 12 },
  removeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }
})
