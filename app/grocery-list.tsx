import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  TextInput
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ChevronLeft, Check, CheckSquare, Circle, Square, ShoppingCart, Minus, Plus, RotateCcw } from 'lucide-react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '@/lib/supabase'
import { useThemeColors } from '@/hooks/useTheme'
import { useCalendarStore } from '@/store/calendar-store'
import { getBestIngredientImageUrlForViewing } from '@/lib/spoonacular-images'
import { MealImageFullscreenViewer } from '@/components/MealImageFullscreenViewer'

type Mode = 'all' | 'single' | 'multi'

type GalleryMealRow = {
  id: string
  title: string | null
  base_id: string | null
  protein_id: string | null
  vegetable_id: string | null
  spoonacular_recipe_id: number | null
}

type RecipeDetailRow = {
  spoonacular_recipe_id: number
  servings: number | null
}

type IngredientRow = {
  spoonacular_recipe_id: number
  name: string
  amount: number | null
  unit: string | null
  sort_order: number
  spoonacular_ingredient_id: number | null
}

type IngredientAssetRow = {
  spoonacular_ingredient_id: number
  image_url: string | null
}

type MealWithRecipe = {
  savedMealId: string
  title: string
  galleryMealId: string | null
  spoonacularRecipeId: number | null
}

type QuantityLine = {
  amount: number | null
  unit: string
  recipeTitle: string
  recipeId: number
}

type GroupedIngredient = {
  key: string
  name: string
  imageUrl: string | null
  lines: QuantityLine[]
}

const CHECKED_KEY = '@grocery_checked_v1'

function normalizeName (name: string): string {
  return (name || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function formatAmount (amount: number | null): string {
  if (amount == null || Number.isNaN(amount)) return ''
  const rounded = Math.round(amount * 100) / 100
  return String(rounded)
}

function formatQty (amount: number | null, unit: string | null): string {
  const a = formatAmount(amount)
  const u = (unit ?? '').trim()
  if (!a && !u) return ''
  if (!a) return u
  if (!u) return a
  return `${a} ${u}`
}

function sumSameUnitLines (lines: QuantityLine[]): QuantityLine[] {
  const byUnit = new Map<string, QuantityLine[]>()
  for (const l of lines) {
    const u = normalizeName(l.unit || '')
    if (!byUnit.has(u)) byUnit.set(u, [])
    byUnit.get(u)!.push(l)
  }
  const out: QuantityLine[] = []
  for (const [uKey, list] of byUnit.entries()) {
    if (uKey && list.every(x => x.amount != null)) {
      const total = list.reduce((acc, x) => acc + (x.amount ?? 0), 0)
      out.push({
        amount: total,
        unit: list[0].unit,
        recipeTitle: list.length === 1 ? list[0].recipeTitle : `${list.length} recipes`,
        recipeId: list[0].recipeId
      })
    } else {
      out.push(...list)
    }
  }
  return out
}

function clamp (n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

const PORTION_MULT_MIN = 0.5
const PORTION_MULT_MAX = 10

/** Nearest whole or half (e.g. 2.3→2.5, 3.1→3), then clamp to grocery portion range. */
function snapPortionMultiplier (n: number): number {
  const snapped = Math.round(n * 2) / 2
  return clamp(snapped, PORTION_MULT_MIN, PORTION_MULT_MAX)
}

function formatPortionMultiplierField (n: number): string {
  const v = snapPortionMultiplier(n)
  return Number.isInteger(v) ? String(v) : `${Math.floor(v)}.5`
}

function sanitizePortionMultiplierInput (raw: string): string {
  let s = raw.replace(/[^0-9.]/g, '')
  const i = s.indexOf('.')
  if (i !== -1) {
    s = s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, '')
  }
  return s
}

function mealIdsParamToString (raw: string | string[] | undefined): string {
  if (raw == null) return ''
  return Array.isArray(raw) ? raw.join(',') : String(raw).trim()
}

function parseGroceryParams (p: { mealId?: string; mealIds?: string | string[]; mode?: string }): {
  mode: Mode
  selectionMode: boolean
  selectedMealIds: Set<string>
} {
  const singleMealId = String(p.mealId ?? '').trim()
  if (singleMealId) {
    return { mode: 'single', selectionMode: false, selectedMealIds: new Set([singleMealId]) }
  }
  const str = mealIdsParamToString(p.mealIds)
  const ids = str.split(',').map(s => s.trim()).filter(Boolean)
  if (ids.length > 0) {
    return { mode: 'multi', selectionMode: false, selectedMealIds: new Set(ids) }
  }
  const modeParam = String(p.mode ?? '').toLowerCase()
  if (modeParam === 'multi') {
    return { mode: 'multi', selectionMode: false, selectedMealIds: new Set() }
  }
  return { mode: 'all', selectionMode: false, selectedMealIds: new Set() }
}

function useCheckedSet () {
  const [checked, setChecked] = useState<Set<string>>(new Set())
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(CHECKED_KEY)
        if (cancelled) return
        const arr = raw ? (JSON.parse(raw) as string[]) : []
        setChecked(new Set(arr))
      } catch {}
    })()
    return () => { cancelled = true }
  }, [])
  const toggle = useCallback(async (key: string) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      void AsyncStorage.setItem(CHECKED_KEY, JSON.stringify([...next]))
      return next
    })
  }, [])
  return { checked, toggle, setChecked }
}

export default function GroceryListScreen () {
  const router = useRouter()
  const colors = useThemeColors()
  const { savedMeals } = useCalendarStore()
  const params = useLocalSearchParams<{ mode?: string; mealId?: string; mealIds?: string | string[] }>()
  const mealIdsKey = mealIdsParamToString(params.mealIds)

  const [mode, setMode] = useState<Mode>(() => parseGroceryParams(params).mode)
  const [selectionMode, setSelectionMode] = useState(() => parseGroceryParams(params).selectionMode)
  const [selectedMealIds, setSelectedMealIds] = useState<Set<string>>(() => new Set(parseGroceryParams(params).selectedMealIds))
  const [loading, setLoading] = useState(false)
  const [multiplier, setMultiplier] = useState(1)
  const [portionField, setPortionField] = useState('1')
  const [mealsWithRecipe, setMealsWithRecipe] = useState<MealWithRecipe[]>([])
  const [grouped, setGrouped] = useState<GroupedIngredient[]>([])
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null)
  const { checked, toggle } = useCheckedSet()

  useEffect(() => {
    const next = parseGroceryParams(params)
    setMode(next.mode)
    setSelectionMode(next.selectionMode)
    setSelectedMealIds(new Set(next.selectedMealIds))
  }, [params.mealId, mealIdsKey, params.mode])

  const allSavedMeals = useMemo(() => [...savedMeals].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)), [savedMeals])

  const selectedList = useMemo(() => {
    if (mode === 'all') return allSavedMeals.map(m => m.id)
    return [...selectedMealIds]
  }, [mode, allSavedMeals, selectedMealIds])

  const ingredientCols = 1

  const toggleSelected = useCallback((id: string) => {
    setSelectedMealIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedMealIds(new Set(allSavedMeals.map(m => m.id)))
  }, [allSavedMeals])

  const clearSelection = useCallback(() => {
    setSelectedMealIds(new Set())
  }, [])

  const buildList = useCallback(async (ids: string[]) => {
    if (ids.length === 0) {
      setMealsWithRecipe([])
      setGrouped([])
      return
    }
    setLoading(true)
    try {
      const wanted = ids
        .map(id => allSavedMeals.find(m => m.id === id))
        .filter(Boolean) as Array<typeof allSavedMeals[number]>

      const { data: galleryData } = await supabase
        .from('gallery_meals')
        .select('id, title, base_id, protein_id, vegetable_id, spoonacular_recipe_id')

      const galleryRows = (galleryData ?? []) as GalleryMealRow[]
      const galleryByKey = new Map<string, GalleryMealRow>()
      for (const row of galleryRows) {
        const k = `${row.base_id ?? ''}|${row.protein_id ?? ''}|${row.vegetable_id ?? ''}|${(row.title ?? '').trim().toLowerCase()}`
        if (!galleryByKey.has(k)) galleryByKey.set(k, row)
      }

      const meals: MealWithRecipe[] = wanted.map((m) => {
        const k = `${m.baseId ?? ''}|${m.proteinId ?? ''}|${m.vegetableId ?? ''}|${(m.title ?? '').trim().toLowerCase()}`
        const row = galleryByKey.get(k) ?? null
        return {
          savedMealId: m.id,
          title: m.title,
          galleryMealId: row?.id ?? null,
          spoonacularRecipeId: row?.spoonacular_recipe_id ?? null
        }
      })

      const recipeIds = [...new Set(meals.map(m => m.spoonacularRecipeId).filter((x): x is number => x != null))]
      if (recipeIds.length === 0) {
        setMealsWithRecipe(meals)
        setGrouped([])
        return
      }

      const [{ data: ingData }, { data: detailData }] = await Promise.all([
        supabase
          .from('recipe_ingredients')
          .select('spoonacular_recipe_id, name, amount, unit, sort_order, spoonacular_ingredient_id')
          .in('spoonacular_recipe_id', recipeIds)
          .order('sort_order'),
        supabase
          .from('spoonacular_recipe_details')
          .select('spoonacular_recipe_id, servings')
          .in('spoonacular_recipe_id', recipeIds)
      ])

      const ingredients = (ingData ?? []) as IngredientRow[]
      const details = (detailData ?? []) as RecipeDetailRow[]
      const servingsByRecipe = new Map<number, number>()
      for (const d of details) {
        if (d.servings != null) servingsByRecipe.set(d.spoonacular_recipe_id, d.servings)
      }

      const ingIds = ingredients
        .map(r => r.spoonacular_ingredient_id)
        .filter((x): x is number => x != null)
      const uniqIngIds = [...new Set(ingIds)]
      const imgByIngId = new Map<number, string>()
      if (uniqIngIds.length > 0) {
        const { data: assetData } = await supabase
          .from('ingredient_assets')
          .select('spoonacular_ingredient_id, image_url')
          .in('spoonacular_ingredient_id', uniqIngIds)
        for (const r of (assetData ?? []) as IngredientAssetRow[]) {
          if (r.image_url) imgByIngId.set(r.spoonacular_ingredient_id, r.image_url)
        }
      }

      const recipeTitleById = new Map<number, string>()
      for (const m of meals) {
        if (m.spoonacularRecipeId != null) recipeTitleById.set(m.spoonacularRecipeId, m.title)
      }

      const groups = new Map<string, GroupedIngredient>()
      for (const ing of ingredients) {
        const baseName = ing.name || ''
        const key = normalizeName(baseName)
        if (!key) continue
        const recipeTitle = recipeTitleById.get(ing.spoonacular_recipe_id) ?? 'Recipe'
        const baseServings = servingsByRecipe.get(ing.spoonacular_recipe_id) ?? null
        const scaledAmount =
          ing.amount != null
            ? ing.amount * multiplier
            : null
        const line: QuantityLine = {
          amount: scaledAmount,
          unit: (ing.unit ?? '').trim(),
          recipeTitle: baseServings ? `${recipeTitle} (${baseServings} serves)` : recipeTitle,
          recipeId: ing.spoonacular_recipe_id
        }
        if (!groups.has(key)) {
          groups.set(key, {
            key,
            name: baseName.trim(),
            imageUrl: ing.spoonacular_ingredient_id != null ? (imgByIngId.get(ing.spoonacular_ingredient_id) ?? null) : null,
            lines: []
          })
        }
        groups.get(key)!.lines.push(line)
      }

      const list = [...groups.values()].map((g) => ({
        ...g,
        lines: sumSameUnitLines(g.lines)
      }))
        .sort((a, b) => a.name.localeCompare(b.name))

      setMealsWithRecipe(meals)
      setGrouped(list)
    } catch (e) {
      Alert.alert('Could not build grocery list', 'Please try again.')
      setGrouped([])
    } finally {
      setLoading(false)
    }
  }, [allSavedMeals, multiplier])

  useEffect(() => {
    if (mode === 'multi' && selectionMode) return
    void buildList(selectedList)
  }, [mode, selectionMode, selectedList, buildList])

  const commitPortionField = useCallback(() => {
    const t = portionField.trim().replace(/,/g, '.')
    if (t === '' || t === '.') {
      setPortionField(formatPortionMultiplierField(multiplier))
      return
    }
    const parsed = parseFloat(t)
    if (Number.isNaN(parsed)) {
      setPortionField(formatPortionMultiplierField(multiplier))
      return
    }
    const next = snapPortionMultiplier(parsed)
    setMultiplier(next)
    // Normalize display even when multiplier is unchanged (e.g. "1.0" → "1")
    setPortionField(formatPortionMultiplierField(next))
  }, [portionField, multiplier])

  const inc = useCallback(() => {
    setMultiplier((m) => snapPortionMultiplier(m + 0.5))
  }, [])

  const dec = useCallback(() => {
    setMultiplier((m) => snapPortionMultiplier(m - 0.5))
  }, [])

  const reset = useCallback(() => {
    setMultiplier(1)
  }, [])

  useEffect(() => {
    setPortionField(formatPortionMultiplierField(multiplier))
  }, [multiplier])

  const headerRight = (
    <View style={styles.headerRight}>
      <View style={[styles.multPill, { backgroundColor: colors.secondaryBg, borderColor: colors.cardBorder }]}>
        <TouchableOpacity onPress={dec} style={styles.pillBtn} activeOpacity={0.7}>
          <Minus size={16} color={colors.textMuted} />
        </TouchableOpacity>
        <View style={styles.multFieldRow}>
          <TextInput
            value={portionField}
            onChangeText={(t) => setPortionField(sanitizePortionMultiplierInput(t))}
            onBlur={commitPortionField}
            onSubmitEditing={commitPortionField}
            keyboardType="decimal-pad"
            returnKeyType="done"
            selectTextOnFocus
            accessibilityLabel="Portion multiplier, type a number then tap away or Done"
            placeholder="1"
            placeholderTextColor={colors.textMuted}
            underlineColorAndroid="transparent"
            style={[styles.multInput, { color: colors.text }]}
          />
          <Text style={[styles.multSuffix, { color: colors.text }]}>×</Text>
        </View>
        <TouchableOpacity onPress={inc} style={styles.pillBtn} activeOpacity={0.7}>
          <Plus size={16} color={colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity onPress={reset} style={styles.pillBtn} activeOpacity={0.7}>
          <RotateCcw size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  )

  const titleText =
    mode === 'single'
      ? 'Grocery List'
      : mode === 'multi'
        ? 'Grocery List'
        : 'Grocery List'

  const renderMealChip = ({ item }: { item: typeof allSavedMeals[number] }) => {
    const isSelected = selectedMealIds.has(item.id)
    const circleIcon = isSelected ? CheckSquare : Square
    const CircleIcon = circleIcon
    return (
      <Pressable
        onPress={() => {
          if (!selectionMode) {
            router.push({ pathname: '/grocery-list', params: { mode: 'single', mealId: item.id } })
            return
          }
          toggleSelected(item.id)
        }}
        onLongPress={() => {
          setMode('multi')
          setSelectionMode(true)
          setSelectedMealIds(new Set([item.id]))
        }}
        style={[
          styles.mealPickRow,
          { backgroundColor: colors.card, borderColor: colors.cardBorder },
          isSelected && selectionMode ? { borderColor: colors.primary } : null
        ]}
      >
        {selectionMode && (
          <View style={styles.mealPickCheck}>
            <CircleIcon size={20} color={isSelected ? colors.primary : colors.textMuted} />
          </View>
        )}
        <Text style={[styles.mealPickTitle, { color: colors.text }]} numberOfLines={2}>
          {item.title || 'Meal'}
        </Text>
        <ChevronLeft size={0} />
      </Pressable>
    )
  }

  const renderIngredient = ({ item }: { item: GroupedIngredient }) => {
    const isDone = checked.has(item.key)
    const usedIn = [...new Set(item.lines.map((l) => l.recipeTitle).filter(Boolean))].slice(0, 3)
    const usedInText = usedIn.length > 0
      ? `Used in: ${usedIn.join(', ')}${item.lines.length > usedIn.length ? '…' : ''}`
      : ''
    return (
      <Pressable
        onPress={() => toggle(item.key)}
        style={[
          styles.ingRow,
          { backgroundColor: colors.card, borderColor: colors.cardBorder },
          isDone ? { opacity: 0.6 } : null
        ]}
      >
        <TouchableOpacity
          onPress={() => {
            if (!item.imageUrl) return
            const hi = getBestIngredientImageUrlForViewing(item.imageUrl) ?? item.imageUrl
            void Image.prefetch(hi).catch(() => {})
            setActiveImageUrl(hi)
          }}
          disabled={!item.imageUrl}
          style={[styles.ingImgWrap, { backgroundColor: colors.secondaryBg, borderColor: colors.cardBorder }]}
          activeOpacity={0.85}
        >
          {item.imageUrl
            ? <Image source={{ uri: item.imageUrl }} style={styles.ingImg} />
            : <ShoppingCart size={18} color={colors.textMuted} />}
        </TouchableOpacity>
        <View style={styles.ingMid}>
          <Text
            style={[
              styles.ingName,
              { color: colors.text },
              isDone ? styles.ingNameDone : null
            ]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <Text style={[styles.ingQty, { color: colors.textMuted }]} numberOfLines={2}>
            {item.lines.map((l) => formatQty(l.amount, l.unit)).filter(Boolean).join(' · ') || '—'}
          </Text>
          {usedInText ? (
            <Text style={[styles.ingUsedIn, { color: colors.textMuted }]} numberOfLines={2}>
              {usedInText}
            </Text>
          ) : null}
        </View>
        <View style={styles.ingRight}>
          <View
            style={[
              styles.ingCheckCircle,
              { borderColor: isDone ? colors.primary : colors.cardBorder, backgroundColor: isDone ? colors.primary : 'transparent' }
            ]}
          >
            {isDone && <Check size={16} color="#ffffff" />}
          </View>
        </View>
      </Pressable>
    )
  }

  const emptyState = (
    <View style={styles.emptyWrap}>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No ingredients yet</Text>
      <Text style={[styles.emptySub, { color: colors.textMuted }]}>
        Add some meals to “Meals I want” (with linked recipes) to generate a grocery list.
      </Text>
    </View>
  )

  const footer = selectionMode && mode === 'multi'
    ? (
        <View style={[styles.selectionBar, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.selectionText, { color: colors.text }]}>
            {selectedMealIds.size} meal{selectedMealIds.size === 1 ? '' : 's'} selected
          </Text>
          <View style={styles.selectionBtns}>
            <TouchableOpacity onPress={selectAll} style={[styles.selBtn, { backgroundColor: colors.secondaryBg }]} activeOpacity={0.85}>
              <Text style={[styles.selBtnText, { color: colors.text }]}>Select all</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={clearSelection} style={[styles.selBtn, { backgroundColor: colors.secondaryBg }]} activeOpacity={0.85}>
              <Text style={[styles.selBtnText, { color: colors.text }]}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setSelectionMode(false)
                void buildList([...selectedMealIds])
              }}
              style={[styles.genBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.9}
            >
              <Text style={styles.genBtnText}>Generate</Text>
            </TouchableOpacity>
          </View>
        </View>
      )
    : null

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {titleText}
        </Text>
        {headerRight}
      </View>

      {mode === 'multi' && selectionMode && (
        <View style={styles.pickWrap}>
          <FlatList
            data={allSavedMeals}
            keyExtractor={(m) => m.id}
            renderItem={renderMealChip}
            contentContainerStyle={styles.pickList}
          />
        </View>
      )}

      {!(mode === 'multi' && selectionMode) && (
        <View style={styles.listWrap}>
          {loading ? (
            <ActivityIndicator size="large" color={colors.textMuted} style={{ marginTop: 40 }} />
          ) : grouped.length === 0 ? (
            emptyState
          ) : (
            <FlatList
              data={grouped}
              keyExtractor={(g) => g.key}
              renderItem={renderIngredient}
              contentContainerStyle={styles.ingList}
              initialNumToRender={16}
              windowSize={7}
            />
          )}
        </View>
      )}

      {footer}

      <MealImageFullscreenViewer
        visible={activeImageUrl != null}
        imageUrl={activeImageUrl}
        onClose={() => setActiveImageUrl(null)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  backBtn: {
    padding: 8
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800'
  },
  headerRight: {
    alignItems: 'flex-end'
  },
  multPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 999,
    overflow: 'hidden'
  },
  pillBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  multFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    minWidth: 56,
    minHeight: 36
  },
  multInput: {
    minWidth: 32,
    maxWidth: 56,
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center'
  },
  multSuffix: {
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 2
  },
  listWrap: {
    flex: 1
  },
  ingList: {
    padding: 14,
    paddingBottom: 110
  },
  ingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    gap: 12
  },
  ingImgWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  ingImg: {
    width: '100%',
    height: '100%'
  },
  ingMid: { flex: 1, minWidth: 0 },
  ingName: { fontSize: 15, fontWeight: '800' },
  ingNameDone: { textDecorationLine: 'line-through' },
  ingQty: { marginTop: 3, fontSize: 13, fontWeight: '600' },
  ingUsedIn: { marginTop: 5, fontSize: 12, fontWeight: '600', lineHeight: 16 },
  ingRight: { paddingLeft: 4 },
  ingCheckCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyWrap: {
    padding: 18,
    marginTop: 26
  },
  emptyTitle: { fontSize: 18, fontWeight: '900' },
  emptySub: { marginTop: 8, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  pickWrap: { flex: 1 },
  pickList: { padding: 14, paddingBottom: 120 },
  mealPickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    gap: 10
  },
  mealPickCheck: { width: 24, alignItems: 'center' },
  mealPickTitle: { flex: 1, minWidth: 0, fontSize: 14, fontWeight: '800' },
  selectionBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12
  },
  selectionText: { fontSize: 13, fontWeight: '800' },
  selectionBtns: { flexDirection: 'row', gap: 8, marginTop: 10 },
  selBtn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12 },
  selBtnText: { fontSize: 13, fontWeight: '800' },
  genBtn: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, alignItems: 'center' },
  genBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '900' }
})

