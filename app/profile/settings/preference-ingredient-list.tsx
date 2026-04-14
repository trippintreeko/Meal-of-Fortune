import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { Easing, LinearTransition, StretchOutY } from 'react-native-reanimated'
import { ChevronLeft, X } from 'lucide-react-native'
import { useThemeColors } from '@/hooks/useTheme'
import { useFoodPreferencesStore, type PreferenceKind } from '@/store/food-preferences-store'
import { useSocialAuth } from '@/hooks/useSocialAuth'
import { useProfileSettings } from '@/hooks/useProfileSettings'
import { supabase } from '@/lib/supabase'
import { preferenceIngredientLabel } from '@/lib/preference-ingredient-labels'

function endOfTodayISO (): string {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  d.setDate(d.getDate() + 1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

type FoodName = { id: string; name: string }

function parseKind (raw: unknown): PreferenceKind {
  const s = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : ''
  if (s === 'favorite' || s === 'dislike' || s === 'never_today') return s
  return 'never_today'
}

const SCROLL_BOTTOM = 48

/** Vertical collapse (scaleY → 0); siblings use LinearTransition to slide into place */
const ROW_EXIT_EASE = Easing.bezier(0.4, 0, 0.2, 1)
const ROW_LAYOUT_EASE = Easing.bezier(0.25, 0.1, 0.25, 1)
const ROW_ANIM_MS = 300
const preferenceRowExit = StretchOutY.duration(ROW_ANIM_MS).easing(ROW_EXIT_EASE)
const preferenceRowLayout = LinearTransition.duration(ROW_ANIM_MS).easing(ROW_LAYOUT_EASE)

export default function PreferenceIngredientListScreen () {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const colors = useThemeColors()
  const params = useLocalSearchParams<{ kind?: string }>()
  const kind = useMemo(() => parseKind(params.kind), [params.kind])

  const { profile, refreshProfile } = useSocialAuth()
  const authId = profile?.auth_id ?? undefined
  const { updateProfile } = useProfileSettings(authId, profile, refreshProfile)

  const favoriteIds = useFoodPreferencesStore((s) => s.favoriteIds)
  const dislikeIds = useFoodPreferencesStore((s) => s.dislikeIds)
  const notTodayIds = useFoodPreferencesStore((s) => s.notTodayIds)
  const setFavorites = useFoodPreferencesStore((s) => s.setFavorites)
  const setDislikes = useFoodPreferencesStore((s) => s.setDislikes)
  const setNotToday = useFoodPreferencesStore((s) => s.setNotToday)
  const setAppliedDietIds = useFoodPreferencesStore((s) => s.setAppliedDietIds)
  const loadStore = useFoodPreferencesStore((s) => s.load)
  const hydrated = useFoodPreferencesStore((s) => s.hydrated)

  const idsForKind = useMemo(() => {
    if (kind === 'favorite') return favoriteIds
    if (kind === 'dislike') return dislikeIds
    return notTodayIds
  }, [kind, favoriteIds, dislikeIds, notTodayIds])

  const [names, setNames] = useState<FoodName[]>([])
  const [loadingNames, setLoadingNames] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const namesRef = useRef<FoodName[]>([])
  useEffect(() => {
    namesRef.current = names
  }, [names])

  useEffect(() => {
    loadStore()
  }, [loadStore])

  useEffect(() => {
    let cancelled = false

    const syncNamesWithIds = async () => {
      if (idsForKind.length === 0) {
        setNames([])
        setLoadingNames(false)
        return
      }

      const prev = namesRef.current
      const byId = new Map(prev.map((n) => [n.id, n]))
      const allResolvedLocally = idsForKind.every((id) => byId.has(id))

      if (allResolvedLocally) {
        setNames(
          idsForKind.map((id) => {
            const row = byId.get(id)!
            return { id, name: preferenceIngredientLabel(row.name) }
          })
        )
        setLoadingNames(false)
        return
      }

      setLoadingNames(true)
      const spoonIds = idsForKind
        .map((id) => Number(id))
        .filter((n) => Number.isFinite(n))
      const { data, error } = await supabase
        .from('ingredient_assets')
        .select('spoonacular_ingredient_id, name')
        .in('spoonacular_ingredient_id', spoonIds)

      if (cancelled) return
      setLoadingNames(false)
      if (error) {
        setNames(idsForKind.map((id) => ({ id, name: preferenceIngredientLabel(id) })))
        return
      }
      const rows = (data ?? []) as Array<{ spoonacular_ingredient_id: number; name: string }>
      const fromDb = new Map(rows.map((r) => [String(r.spoonacular_ingredient_id), r.name]))
      setNames(
        idsForKind.map((id) => {
          const raw = fromDb.get(id) ?? id
          return { id, name: preferenceIngredientLabel(raw) }
        })
      )
    }

    syncNamesWithIds()
    return () => {
      cancelled = true
    }
  }, [idsForKind])

  const syncNotTodayToProfile = useCallback(
    async (ids: string[]) => {
      if (!authId) return
      await updateProfile({ dont_want_today: ids, dont_want_expires: endOfTodayISO() })
      refreshProfile()
    },
    [authId, updateProfile, refreshProfile]
  )

  const removeOne = async (foodId: string) => {
    setSyncing(true)
    try {
      if (kind === 'favorite') {
        await setFavorites(favoriteIds.filter((id) => id !== foodId))
      } else if (kind === 'dislike') {
        await setDislikes(dislikeIds.filter((id) => id !== foodId))
      } else {
        const next = notTodayIds.filter((id) => id !== foodId)
        await setNotToday(next)
        await syncNotTodayToProfile(next)
      }
    } finally {
      setSyncing(false)
    }
  }

  const clearAll = async () => {
    setSyncing(true)
    try {
      if (kind === 'favorite') {
        await setAppliedDietIds('favorite', [])
        await setFavorites([])
      } else if (kind === 'dislike') {
        await setAppliedDietIds('dislike', [])
        await setDislikes([])
      } else {
        await setAppliedDietIds('never_today', [])
        await setNotToday([])
        await syncNotTodayToProfile([])
      }
    } finally {
      setSyncing(false)
    }
  }

  const title = kind === 'favorite'
    ? 'Favorites'
    : kind === 'dislike'
      ? 'Dislikes'
      : 'Not Today'

  const subtitle = kind === 'favorite'
    ? 'Ingredients you marked as favorites. Remove items below or use Clear all.'
    : kind === 'dislike'
      ? 'Ingredients you marked as dislikes. Remove items below or use Clear all.'
      : 'Temporary exclusions reset at midnight. Your profile syncs when you change this list while signed in.'

  const emptyHint = kind === 'favorite'
    ? 'No favorites yet.'
    : kind === 'dislike'
      ? 'No dislikes yet.'
      : 'No items excluded today.'

  const countLabel = kind === 'never_today'
    ? `${names.length} item(s) excluded today`
    : `${names.length} ingredient(s)`

  if (!hydrated) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          disabled={syncing}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + SCROLL_BOTTOM }
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>

        {idsForKind.length > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={clearAll} disabled={syncing}>
            <Text style={styles.clearBtnText}>Clear all</Text>
          </TouchableOpacity>
        )}

        {loadingNames ? (
          <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
        ) : names.length === 0 ? (
          <Text style={[styles.hint, { color: colors.textMuted }]}>{emptyHint}</Text>
        ) : (
          <>
            <Text style={[styles.listTitle, { color: colors.textMuted }]}>{countLabel}</Text>
            <View style={styles.list}>
              {names.map((item) => (
                <Animated.View
                  key={item.id}
                  layout={preferenceRowLayout}
                  exiting={preferenceRowExit}
                  style={styles.rowOuter}
                >
                  <View
                    style={[styles.row, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                  >
                    <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <TouchableOpacity
                      style={[styles.removeBtn, { backgroundColor: colors.border }]}
                      onPress={() => removeOne(item.id)}
                      disabled={syncing}
                    >
                      <X size={16} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                </Animated.View>
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8
  },
  backBtn: { padding: 4 },
  scroll: { paddingTop: 8, paddingHorizontal: 20 },
  title: { flex: 1, fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 14, marginBottom: 16 },
  clearBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#fecaca',
    borderRadius: 10,
    marginBottom: 16
  },
  clearBtnText: { fontSize: 14, fontWeight: '600', color: '#dc2626' },
  loader: { marginVertical: 24 },
  hint: { fontSize: 14, marginTop: 8 },
  listTitle: { fontSize: 13, fontWeight: '600', marginBottom: 12 },
  list: { gap: 8 },
  rowOuter: {
    borderRadius: 12,
    overflow: 'hidden'
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14
  },
  rowName: { flex: 1, fontSize: 16, marginRight: 12 },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  }
})
