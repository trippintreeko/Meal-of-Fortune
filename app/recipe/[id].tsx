import { useCallback, useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ChevronLeft, Clock, Users, ShoppingCart } from 'lucide-react-native'
// Recipe notes tab (restore later): add TextInput to react-native import; FileText + StickyNote from lucide; AsyncStorage
import { useThemeColors } from '@/hooks/useTheme'
import { supabase } from '@/lib/supabase'
import { instructionsToSteps } from '@/lib/recipes/instructions'
import {
  getBestRecipeImageUrlForViewing,
  getBestIngredientImageUrlForViewing
} from '@/lib/spoonacular-images'
import { MealImageFullscreenViewer } from '@/components/MealImageFullscreenViewer'
import { useCalendarStore } from '@/store/calendar-store'

// const RECIPE_NOTES_KEY_PREFIX = 'recipe_notes_'

type GalleryMealRow = {
  id: string
  title: string
  spoonacular_recipe_id: number | null
}

type RecipeDetailsRow = {
  spoonacular_recipe_id: number
  title: string | null
  instructions: string | null
  servings: number | null
  ready_in_minutes: number | null
  image_url: string | null
}

type RecipeIngredientRow = {
  name: string
  amount: number | null
  unit: string | null
  sort_order: number
  spoonacular_ingredient_id: number | null
}

function formatIngredient (ing: RecipeIngredientRow): string {
  const parts: string[] = []
  if (ing.amount != null) parts.push(String(ing.amount))
  if (ing.unit) parts.push(ing.unit)
  if (ing.name) parts.push(ing.name)
  return parts.join(' ')
}

export default function RecipeScreen () {
  const router = useRouter()
  const colors = useThemeColors()
  const savedMeals = useCalendarStore(s => s.savedMeals)
  const params = useLocalSearchParams<{ id?: string; grocery?: string; savedMealId?: string }>()
  const id = (params.id ?? '').trim()
  const savedMealId = (params.savedMealId ?? '').trim()
  const openGrocery =
    params.grocery === '1' ||
    params.grocery === 'true' ||
    (Array.isArray(params.grocery) && params.grocery[0] === '1')

  const [loading, setLoading] = useState(true)
  // const [activeTab, setActiveTab] = useState<'recipe' | 'notes'>('recipe')
  const [title, setTitle] = useState('Recipe')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [servings, setServings] = useState<number | null>(null)
  const [readyInMinutes, setReadyInMinutes] = useState<number | null>(null)
  const [instructions, setInstructions] = useState<string | null>(null)
  const [ingredients, setIngredients] = useState<RecipeIngredientRow[]>([])
  const [ingredientImageMap, setIngredientImageMap] = useState<Map<number, string>>(new Map())
  // const [notes, setNotes] = useState('')
  // const [notesLoaded, setNotesLoaded] = useState(false)
  // const [savingNotes, setSavingNotes] = useState(false)
  const [fullScreenImageUrl, setFullScreenImageUrl] = useState<string | null>(null)
  const scrollRef = useRef<ScrollView>(null)
  const ingredientsY = useRef(0)

  const openRecipeImageFullscreen = useCallback((url: string) => {
    const hi = getBestRecipeImageUrlForViewing(url) ?? url
    void Image.prefetch(hi).catch(() => {})
    setFullScreenImageUrl(hi)
  }, [])

  const openIngredientImageFullscreen = useCallback((url: string) => {
    const hi = getBestIngredientImageUrlForViewing(url) ?? url
    void Image.prefetch(hi).catch(() => {})
    setFullScreenImageUrl(hi)
  }, [])

  const steps = instructions ? instructionsToSteps(instructions) : []

  // const loadNotes = useCallback(async () => {
  //   if (!id) return
  //   try {
  //     const raw = await AsyncStorage.getItem(RECIPE_NOTES_KEY_PREFIX + id)
  //     setNotes(raw ?? '')
  //   } catch {
  //     setNotes('')
  //   } finally {
  //     setNotesLoaded(true)
  //   }
  // }, [id])

  // const saveNotes = useCallback(async () => {
  //   if (!id) return
  //   setSavingNotes(true)
  //   try {
  //     await AsyncStorage.setItem(RECIPE_NOTES_KEY_PREFIX + id, notes)
  //   } finally {
  //     setSavingNotes(false)
  //   }
  // }, [id, notes])

  useEffect(() => {
    let cancelled = false
    if (!id) {
      setLoading(false)
      return
    }
    setLoading(true)
    void (async () => {
      try {
        const { data: mealData } = await supabase
          .from('gallery_meals')
          .select('id, title, spoonacular_recipe_id')
          .eq('id', id)
          .maybeSingle()
        if (cancelled) return
        const meal = mealData as GalleryMealRow | null
        setTitle(meal?.title ?? 'Recipe')
        const recipeId = meal?.spoonacular_recipe_id ?? null
        if (recipeId != null) {
          const { data: detailData } = await supabase
            .from('spoonacular_recipe_details')
            .select('spoonacular_recipe_id, title, instructions, servings, ready_in_minutes, image_url')
            .eq('spoonacular_recipe_id', recipeId)
            .maybeSingle()
          if (cancelled) return
          const detail = detailData as RecipeDetailsRow | null
          if (detail) {
            if (detail.title) setTitle(detail.title)
            setImageUrl(detail.image_url ?? null)
            setServings(detail.servings ?? null)
            setReadyInMinutes(detail.ready_in_minutes ?? null)
            setInstructions(detail.instructions ?? null)
          }
          const { data: ingData } = await supabase
            .from('recipe_ingredients')
            .select('name, amount, unit, sort_order, spoonacular_ingredient_id')
            .eq('spoonacular_recipe_id', recipeId)
            .order('sort_order')
          if (cancelled) return
          const ingRows = (ingData ?? []) as RecipeIngredientRow[]
          setIngredients(ingRows)
          const ingIds = ingRows
            .map((r) => r.spoonacular_ingredient_id)
            .filter((id): id is number => id != null)
          const uniqIds = [...new Set(ingIds)]
          if (uniqIds.length > 0) {
            const { data: assetData } = await supabase
              .from('ingredient_assets')
              .select('spoonacular_ingredient_id, image_url')
              .in('spoonacular_ingredient_id', uniqIds)
            if (!cancelled && assetData?.length) {
              const map = new Map<number, string>()
              for (const row of assetData as Array<{ spoonacular_ingredient_id: number, image_url: string }>) {
                if (row.image_url) map.set(row.spoonacular_ingredient_id, row.image_url)
              }
              setIngredientImageMap(map)
            }
          } else {
            setIngredientImageMap(new Map())
          }
        } else {
          setIngredients([])
          setIngredientImageMap(new Map())
          setInstructions(null)
          setImageUrl(null)
          setServings(null)
          setReadyInMinutes(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id])

  // useEffect(() => {
  //   if (activeTab === 'notes' && id) void loadNotes()
  // }, [activeTab, id, loadNotes])

  useEffect(() => {
    if (!openGrocery || loading) return
    if (ingredients.length === 0) return
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, ingredientsY.current - 16),
        animated: true
      })
    }, 400)
    return () => clearTimeout(t)
  }, [openGrocery, loading, ingredients.length])

  // const handleBlurNotes = () => {
  //   if (id && notesLoaded) void saveNotes()
  // }

  const hasRecipe =
    !!imageUrl ||
    ingredients.length > 0 ||
    !!instructions ||
    servings != null ||
    readyInMinutes != null

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        <TouchableOpacity
          style={styles.headerIconBtn}
          activeOpacity={0.85}
          onPress={() => {
            const explicitSaved = (savedMealId ?? '').trim()
            if (explicitSaved) {
              router.push({ pathname: '/grocery-list', params: { mealId: explicitSaved } })
              return
            }
            const galleryKey = (id ?? '').trim()
            const linked = galleryKey
              ? savedMeals.find((m) => (m.galleryMealId ?? '').trim() === galleryKey)
              : undefined
            if (linked) {
              router.push({ pathname: '/grocery-list', params: { mealId: linked.id } })
              return
            }
            Alert.alert(
              'Grocery list',
              'Add this meal to “Meals I want” first (heart it on the food gallery). Then tap the cart again to open a grocery list with its ingredients.'
            )
          }}
        >
          <ShoppingCart size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/*
      <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'recipe' && { borderBottomColor: colors.text, borderBottomWidth: 2 }
          ]}
          onPress={() => setActiveTab('recipe')}
        >
          <FileText size={18} color={activeTab === 'recipe' ? colors.text : colors.textMuted} />
          <Text style={[styles.tabText, { color: activeTab === 'recipe' ? colors.text : colors.textMuted }]}>
            Recipe
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'notes' && { borderBottomColor: colors.text, borderBottomWidth: 2 }
          ]}
          onPress={() => setActiveTab('notes')}
        >
          <StickyNote size={18} color={activeTab === 'notes' ? colors.text : colors.textMuted} />
          <Text style={[styles.tabText, { color: activeTab === 'notes' ? colors.text : colors.textMuted }]}>
            Notes
          </Text>
        </TouchableOpacity>
      </View>
      */}

      <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <ActivityIndicator size="large" color={colors.textMuted} style={styles.loader} />
          ) : !hasRecipe ? (
            <Text style={[styles.empty, { color: colors.textMuted }]}>
              No Spoonacular recipe linked for this meal. Add one from the gallery to see ingredients and steps here.
            </Text>
          ) : (
            <>
              {imageUrl && (
                <TouchableOpacity
                  style={styles.imageWrap}
                  activeOpacity={0.92}
                  onPress={() => openRecipeImageFullscreen(imageUrl)}
                  accessibilityRole="image"
                  accessibilityLabel="Recipe photo, tap to enlarge"
                >
                  <Image source={{ uri: imageUrl }} style={styles.recipeImage} resizeMode="cover" />
                </TouchableOpacity>
              )}
              <View style={[styles.metaRow, { backgroundColor: colors.secondaryBg }]}>
                {readyInMinutes != null && (
                  <View style={styles.metaItem}>
                    <Clock size={18} color={colors.textMuted} />
                    <Text style={[styles.metaText, { color: colors.textMuted }]}>{readyInMinutes} min</Text>
                  </View>
                )}
                {servings != null && (
                  <View style={styles.metaItem}>
                    <Users size={18} color={colors.textMuted} />
                    <Text style={[styles.metaText, { color: colors.textMuted }]}>Serves {servings}</Text>
                  </View>
                )}
              </View>
              {ingredients.length > 0 && (
                <View
                  style={styles.section}
                  onLayout={(e) => {
                    ingredientsY.current = e.nativeEvent.layout.y
                  }}
                >
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Ingredients</Text>
                  {ingredients.map((ing, i) => {
                    const imgUrl = ing.spoonacular_ingredient_id != null
                      ? ingredientImageMap.get(ing.spoonacular_ingredient_id)
                      : undefined
                    return (
                      <View key={i} style={styles.ingredientRow}>
                        <TouchableOpacity
                          style={[styles.ingredientThumb, { backgroundColor: colors.secondaryBg }]}
                          activeOpacity={imgUrl ? 0.85 : 1}
                          disabled={!imgUrl}
                          onPress={() => imgUrl && openIngredientImageFullscreen(imgUrl)}
                          accessibilityRole={imgUrl ? 'image' : undefined}
                          accessibilityLabel={imgUrl ? `${ing.name || 'Ingredient'} photo, tap to enlarge` : undefined}
                        >
                          {imgUrl
                            ? (
                                <Image source={{ uri: imgUrl }} style={styles.ingredientThumbImage} resizeMode="cover" />
                              )
                            : (
                                <View style={styles.ingredientThumbPlaceholder} />
                              )}
                        </TouchableOpacity>
                        <Text style={[styles.ingredientLine, { color: colors.text }]}>
                          • {formatIngredient(ing)}
                        </Text>
                      </View>
                    )
                  })}
                </View>
              )}
              {steps.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Steps</Text>
                  {steps.map((step, i) => (
                    <View key={i} style={styles.stepRow}>
                      <Text style={[styles.stepNum, { color: colors.textMuted }]}>{i + 1}.</Text>
                      <Text style={[styles.stepText, { color: colors.text }]}>{step}</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>

      {/*
      {activeTab === 'notes' && (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {!notesLoaded ? (
            <ActivityIndicator size="small" color={colors.textMuted} style={styles.loader} />
          ) : (
            <>
              <Text style={[styles.notesHint, { color: colors.textMuted }]}>
                Add your own notes, substitutions, or reminders for this recipe.
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                onBlur={handleBlurNotes}
                placeholder="e.g. Use less salt, or cook 5 min longer..."
                placeholderTextColor={colors.placeholder}
                style={[
                  styles.notesInput,
                  { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }
                ]}
                multiline
                textAlignVertical="top"
              />
              {savingNotes && (
                <Text style={[styles.savingHint, { color: colors.textMuted }]}>Saving...</Text>
              )}
            </>
          )}
        </ScrollView>
      )}
      */}

      <MealImageFullscreenViewer
        visible={fullScreenImageUrl != null}
        imageUrl={fullScreenImageUrl}
        onClose={() => setFullScreenImageUrl(null)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1
  },
  backButton: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  headerIconBtn: { width: 36, alignItems: 'flex-end' },
  // tabs: {
  //   flexDirection: 'row',
  //   borderBottomWidth: 1
  // },
  // tab: {
  //   flex: 1,
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   justifyContent: 'center',
  //   gap: 8,
  //   paddingVertical: 12
  // },
  // tabText: { fontSize: 15, fontWeight: '600' },
  content: { padding: 20, paddingBottom: 40 },
  loader: { marginVertical: 24, alignSelf: 'center' },
  empty: { fontSize: 15, textAlign: 'center', marginTop: 16 },
  imageWrap: { borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  recipeImage: { width: '100%', height: 200 },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    padding: 14,
    borderRadius: 12,
    marginBottom: 20
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 14 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 10 },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 12 },
  ingredientThumb: { width: 40, height: 40, borderRadius: 8, overflow: 'hidden' },
  ingredientThumbImage: { width: 40, height: 40 },
  ingredientThumbPlaceholder: { width: 40, height: 40 },
  ingredientLine: { fontSize: 15, flex: 1 },
  stepRow: { flexDirection: 'row', marginBottom: 12, gap: 8 },
  stepNum: { fontSize: 15, fontWeight: '700', minWidth: 24 },
  stepText: { fontSize: 15, flex: 1 }
  // notesHint: { fontSize: 13, marginBottom: 10 },
  // notesInput: {
  //   borderWidth: 1,
  //   borderRadius: 12,
  //   padding: 14,
  //   minHeight: 160,
  //   fontSize: 15
  // },
  // savingHint: { fontSize: 12, marginTop: 8 }
})
