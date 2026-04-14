import { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Image,
  Linking,
  Alert
} from 'react-native'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system/legacy'
import { LinearGradient } from 'expo-linear-gradient'
import { X, CalendarPlus, UtensilsCrossed, Share2, Heart, BookOpen, MapPin, Camera, ShoppingCart } from 'lucide-react-native'
import { supabase } from '@/lib/supabase'
import { getBestRecipeImageUrlForViewing, mergeRecipeAndStoredImageUrls } from '@/lib/spoonacular-images'
import { getMealNearMeUrl } from '@/lib/recipes/search'
import { MealImageFullscreenViewer } from '@/components/MealImageFullscreenViewer'
import { useMealPhotosStore } from '@/store/meal-photos-store'
import { useThemeColors } from '@/hooks/useTheme'
import type { SavedMeal } from '@/types/calendar'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const CARD_WIDTH = SCREEN_WIDTH * 0.88

/** Convert image URI to data URL for local storage. Handles file:// and content:// (Android). */
async function uriToDataUrl (uri: string): Promise<string | null> {
  const mime = uri.toLowerCase().includes('.png') ? 'image/png' : 'image/jpeg'
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' })
    return `data:${mime};base64,${base64}`
  } catch {
    try {
      if (FileSystem.documentDirectory) {
        const tempPath = `${FileSystem.documentDirectory}meal_photo_${Date.now()}.jpg`
        await FileSystem.copyAsync({ from: uri, to: tempPath })
        const base64 = await FileSystem.readAsStringAsync(tempPath, { encoding: 'base64' })
        await FileSystem.deleteAsync(tempPath, { idempotent: true })
        return `data:${mime};base64,${base64}`
      }
    } catch (_) {}
    return null
  }
}

type MealDetailModalProps = {
  visible: boolean
  meal: SavedMeal | null
  onClose: () => void
  onShareForVotes: (meal: SavedMeal) => void
  onAddToCalendar: (meal: SavedMeal) => void
  onRemove: (meal: SavedMeal) => void
  /** When set, show Favorite button instead of Delete (for Meal of the day) */
  variant?: 'saved' | 'mealOfTheDay'
  onFavorite?: (meal: SavedMeal) => void
}

export function MealDetailCard ({
  meal,
  onShareForVotes,
  onAddToCalendar,
  onFavorite,
  variant = 'saved',
  onRecipe,
  onRecipeLongPress,
  onMealNearMe,
  onGroceryList
}: {
  meal: SavedMeal
  onShareForVotes?: (meal: SavedMeal) => void
  onAddToCalendar?: (meal: SavedMeal) => void
  onFavorite?: (meal: SavedMeal) => void
  variant?: 'saved' | 'mealOfTheDay' | 'weekPlanner'
  onRecipe: (meal: SavedMeal, recipeId: string | null) => void
  onRecipeLongPress?: (meal: SavedMeal, recipeId: string | null) => void
  onMealNearMe?: (meal: SavedMeal) => void
  /** Gallery meal id (same as /recipe/[id]) for grocery → ingredients */
  onGroceryList?: (meal: SavedMeal, galleryMealId: string | null) => void
}) {
  const [description, setDescription] = useState<string | null>(null)
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [recipeId, setRecipeId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [addingPhoto, setAddingPhoto] = useState(false)
  const [fullScreenViewerUrl, setFullScreenViewerUrl] = useState<string | null>(null)
  const colors = useThemeColors()
  const { load, getPhotoUrl, addPhotoOffline } = useMealPhotosStore()
  const userPhotoUrl = getPhotoUrl(meal.id)

  useEffect(() => {
    void load()
  }, [load])

  const handleAddPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your photos to add a meal picture.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8
    })
    if (result.canceled || !result.assets?.[0]?.uri) return
    const uri = result.assets[0].uri
    setAddingPhoto(true)
    try {
      const dataUrl = await uriToDataUrl(uri)
      if (!dataUrl) {
        Alert.alert('Error', 'Could not read the image. Please try again.')
        return
      }
      await addPhotoOffline(meal.id, dataUrl)
      Alert.alert('Saved', 'Photo saved to this device.')
    } catch (err) {
      Alert.alert('Error', 'Could not save photo.')
    } finally {
      setAddingPhoto(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    type GalleryRow = {
      id: string
      description: string | null
      image_urls: string[] | null
      spoonacular_recipe_id: number | null
    }
    const applyGalleryRow = async (row: GalleryRow | null | undefined) => {
      if (cancelled) return
      if (!row) {
        setRecipeId(null)
        setDescription(null)
        setImageUrls([])
        return
      }
      setRecipeId(row.id)
      setDescription(row.description ?? null)
      const stored = Array.isArray(row.image_urls) ? row.image_urls : []
      let recipeUrl: string | null = null
      if (row.spoonacular_recipe_id != null) {
        const { data: recipeRow } = await supabase
          .from('spoonacular_recipe_details')
          .select('image_url')
          .eq('spoonacular_recipe_id', row.spoonacular_recipe_id)
          .maybeSingle()
        if (!cancelled && recipeRow?.image_url) recipeUrl = recipeRow.image_url
      }
      setImageUrls(mergeRecipeAndStoredImageUrls(recipeUrl, stored, row.spoonacular_recipe_id))
    }
    void (async () => {
      try {
        const galleryMealId = (meal.galleryMealId ?? '').trim()
        // Only gallery_meals.id works here — meal.id is the saved-meal row id, not gallery.
        if (galleryMealId) {
          const { data: byId } = await supabase
            .from('gallery_meals')
            .select('id, description, image_urls, spoonacular_recipe_id')
            .eq('id', galleryMealId)
            .maybeSingle()
          if (cancelled) return
          const rowById = byId as GalleryRow | null
          if (rowById) {
            await applyGalleryRow(rowById)
            if (!cancelled) setLoading(false)
            return
          }
        }
        const { data: compositeData } = await supabase
          .from('gallery_meals')
          .select('id, description, image_urls, spoonacular_recipe_id')
          .eq('base_id', meal.baseId)
          .eq('protein_id', meal.proteinId)
          .eq('vegetable_id', meal.vegetableId)
          .ilike('title', meal.title.trim())
          .limit(1)
        if (cancelled) return
        const compositeRows = compositeData as GalleryRow[] | null
        let row = compositeRows?.[0]
        // Placeholder base/protein/veg from "want this" without real IDs often miss the composite match.
        if (!row && meal.title?.trim()) {
          const { data: titleData } = await supabase
            .from('gallery_meals')
            .select('id, description, image_urls, spoonacular_recipe_id')
            .ilike('title', meal.title.trim())
            .limit(1)
          if (cancelled) return
          const titleRows = titleData as GalleryRow[] | null
          row = titleRows?.[0]
        }
        await applyGalleryRow(row)
      } catch {
        if (!cancelled) {
          setDescription(null)
          setImageUrls([])
          setRecipeId(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [meal.id, meal.galleryMealId, meal.baseId, meal.proteinId, meal.vegetableId, meal.title])

  useEffect(() => {
    setFullScreenViewerUrl(null)
  }, [meal.id])

  const openMealImageFullscreen = useCallback((url: string) => {
    const hi = getBestRecipeImageUrlForViewing(url) ?? url
    void Image.prefetch(hi).catch(() => {})
    setFullScreenViewerUrl(hi)
  }, [])

  const heroUrl = userPhotoUrl || (imageUrls.length > 0 ? imageUrls[0] : null)
  const hasImages = !!heroUrl
  const photoButtonContent = addingPhoto
    ? <ActivityIndicator size="small" color="#ffffff" />
    : (
        <>
          <Camera size={18} color="#ffffff" />
          <Text style={cardStyles.addPhotoBtnLabel}>{userPhotoUrl ? 'Change photo' : 'Add your photo'}</Text>
        </>
      )
  return (
    <View style={[cardStyles.card, { backgroundColor: colors.card }]}>
      <View style={cardStyles.heroWrap}>
        {hasImages
          ? (
            <>
              <TouchableOpacity
                activeOpacity={0.92}
                onPress={() => { if (!addingPhoto) openMealImageFullscreen(heroUrl) }}
                disabled={addingPhoto}
                style={cardStyles.imageHeroTouch}
              >
                <Image source={{ uri: heroUrl }} style={[cardStyles.imageHero, { backgroundColor: colors.primary }]} resizeMode="cover" />
                {!addingPhoto && (
                  <View style={cardStyles.tapToEnlargeHint} pointerEvents="none">
                    <Text style={cardStyles.tapToEnlargeHintText}>Tap to enlarge</Text>
                  </View>
                )}
              </TouchableOpacity>
              {!userPhotoUrl && imageUrls.length > 1 && (
                <View style={cardStyles.imageStrip}>
                  {imageUrls.slice(1, 3).map((url, idx) => (
                    <TouchableOpacity
                      key={idx}
                      activeOpacity={0.85}
                      onPress={() => openMealImageFullscreen(url)}
                      style={cardStyles.imageThumbTouch}
                    >
                      <Image source={{ uri: url }} style={cardStyles.imageThumb} resizeMode="cover" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.7)']}
                style={cardStyles.heroGradient}
                pointerEvents="none"
              />
            </>
            )
          : (
            <>
              <View style={[cardStyles.imagePlaceholder, { backgroundColor: colors.primary }]}>
                <UtensilsCrossed size={48} color="rgba(255,255,255,0.8)" />
              </View>
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.4)']}
                style={cardStyles.heroGradient}
                pointerEvents="none"
              />
            </>
            )}
        {variant !== 'weekPlanner' && (
          <TouchableOpacity
            style={cardStyles.addPhotoBtnOverlay}
            onPress={handleAddPhoto}
            disabled={addingPhoto}
            activeOpacity={0.85}
          >
            {photoButtonContent}
          </TouchableOpacity>
        )}
      </View>
      <Text style={[cardStyles.title, { color: colors.text }]} numberOfLines={2}>{meal.title}</Text>
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} style={cardStyles.loader} />
      ) : description ? (
        <Text style={[cardStyles.description, { color: colors.textMuted }]} numberOfLines={6}>{description}</Text>
      ) : null}

      {variant === 'weekPlanner' && onGroceryList ? (
        <View style={[cardStyles.actionsRow, cardStyles.actionsRowWeekPlanner]}>
          <TouchableOpacity
            style={[
              cardStyles.rowBtnFlex,
              { backgroundColor: colors.secondaryBg },
              (loading || !recipeId) && cardStyles.rowBtnDisabled
            ]}
            onPress={() => onRecipe(meal, recipeId)}
            disabled={loading || !recipeId}
            accessibilityState={{ disabled: loading || !recipeId }}
          >
            <BookOpen size={22} color="#f59e0b" />
            <Text style={[cardStyles.rowBtnText, { color: colors.text }]}>
              {loading ? 'Loading…' : 'Recipe'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              cardStyles.rowBtnFlex,
              { backgroundColor: colors.secondaryBg },
              (loading || !recipeId) && cardStyles.rowBtnDisabled
            ]}
            onPress={() => onGroceryList(meal, recipeId)}
            disabled={loading || !recipeId}
            accessibilityState={{ disabled: loading || !recipeId }}
          >
            <ShoppingCart size={22} color="#22c55e" />
            <Text style={[cardStyles.rowBtnText, { color: colors.text }]}>Grocery list</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={cardStyles.actionsRow}>
          {variant === 'mealOfTheDay' && onFavorite ? (
            <TouchableOpacity
              style={[cardStyles.rowBtn, cardStyles.rowBtnFavorite]}
              onPress={() => onFavorite(meal)}>
              <Heart size={20} color="#ffffff" />
              <Text style={[cardStyles.rowBtnText, cardStyles.rowBtnTextFavorite]}>Favorite</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[
              cardStyles.rowBtn,
              { backgroundColor: colors.secondaryBg },
              (loading || !recipeId) && cardStyles.rowBtnDisabled
            ]}
            onPress={() => onRecipe(meal, recipeId)}
            onLongPress={() => onRecipeLongPress?.(meal, recipeId)}
            delayLongPress={250}
            disabled={loading || !recipeId}
            accessibilityState={{ disabled: loading || !recipeId }}
          >
            <BookOpen size={20} color="#f59e0b" />
            <Text style={[cardStyles.rowBtnText, { color: colors.text }]}>
              {loading ? 'Loading…' : 'Recipe'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[cardStyles.rowBtn, { backgroundColor: colors.secondaryBg }]}
            onPress={() => onMealNearMe?.(meal)}>
            <MapPin size={20} color="#0ea5e9" />
            <Text style={[cardStyles.rowBtnText, { color: colors.text }]}>Near me</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[cardStyles.rowBtn, cardStyles.rowBtnAdd]}
            onPress={() => onAddToCalendar?.(meal)}>
            <CalendarPlus size={20} color="#ffffff" />
            <Text style={[cardStyles.rowBtnText, cardStyles.rowBtnTextAdd]}>Add</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[cardStyles.rowBtn, { backgroundColor: colors.secondaryBg }]}
            onPress={() => onShareForVotes?.(meal)}>
            <Share2 size={20} color={colors.secondary} />
            <Text style={[cardStyles.rowBtnText, { color: colors.text }]}>Share</Text>
          </TouchableOpacity>
        </View>
      )}

      <MealImageFullscreenViewer
        visible={fullScreenViewerUrl != null}
        imageUrl={fullScreenViewerUrl}
        onClose={() => setFullScreenViewerUrl(null)}
      />
    </View>
  )
}

const cardStyles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12
  },
  heroWrap: {
    position: 'relative',
    width: '100%'
  },
  imagePlaceholder: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center'
  },
  imageHeroTouch: {
    position: 'relative',
    width: '100%'
  },
  imageHero: {
    width: '100%',
    height: 200
  },
  tapToEnlargeHint: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    right: 12,
    alignItems: 'center'
  },
  tapToEnlargeHintText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden'
  },
  imageStrip: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 2
  },
  imageThumbTouch: {
    flex: 1
  },
  imageThumb: {
    width: '100%',
    height: 48,
    borderRadius: 8
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 64
  },
  addPhotoBtnOverlay: {
    position: 'absolute',
    bottom: 10,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.45)'
  },
  addPhotoBtnLabel: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600'
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    paddingHorizontal: 20,
    paddingTop: 12
  },
  loader: {
    marginVertical: 12
  },
  description: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 24,
    flexWrap: 'wrap'
  },
  actionsRowWeekPlanner: {
    flexWrap: 'nowrap',
    gap: 10
  },
  rowBtnFlex: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14
  },
  rowBtn: {
    flexGrow: 1,
    flexBasis: '22%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f1f5f9'
  },
  rowBtnDisabled: {
    opacity: 0.45
  },
  rowBtnAdd: {
    backgroundColor: '#22c55e'
  },
  rowBtnFavorite: {
    backgroundColor: '#ec4899'
  },
  rowBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b'
  },
  rowBtnTextAdd: {
    color: '#ffffff'
  },
  rowBtnTextFavorite: {
    color: '#ffffff'
  }
})

export default function MealDetailModal ({
  visible,
  meal,
  onClose,
  onShareForVotes,
  onAddToCalendar,
  onRemove,
  variant = 'saved',
  onFavorite
}: MealDetailModalProps) {
  if (!visible || !meal) return null
  const router = useRouter()
  const colors = useThemeColors()

  const handleMealNearMe = (m: SavedMeal) => {
    void Linking.openURL(getMealNearMeUrl(m.title))
  }

  const handleRecipe = (m: SavedMeal, recipeId: string | null) => {
    if (recipeId) {
      router.push(`/recipe/${recipeId}?savedMealId=${encodeURIComponent(m.id)}`)
      return
    }
    Alert.alert(
      'Recipe unavailable',
      'We couldn\'t link this meal to an in-app recipe. It may need to be saved from the food gallery with a matching dish.'
    )
  }

  const handleRecipeLongPress = (m: SavedMeal, recipeId: string | null) => {
    if (!recipeId) return
    router.push({ pathname: '/grocery-list', params: { mealId: m.id } })
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: colors.background === '#0f172a' ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.5)' }]}>
        <TouchableOpacity style={styles.overlayTouch} activeOpacity={1} onPress={onClose} />
        <View style={styles.centered} pointerEvents="box-none">
          <View style={styles.header}>
            <Text style={[styles.title, { color: '#f1f5f9' }]}>{variant === 'mealOfTheDay' ? 'Meal of the day' : 'Meals I want'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={26} color="#f1f5f9" />
            </TouchableOpacity>
          </View>
          <MealDetailCard
            meal={meal}
            onShareForVotes={(m) => {
              onShareForVotes(m)
              onClose()
            }}
            onAddToCalendar={(m) => {
              onAddToCalendar(m)
              onClose()
            }}
            onMealNearMe={handleMealNearMe}
            onRecipe={(m, recipeId) => {
              handleRecipe(m, recipeId)
              onClose()
            }}
            onRecipeLongPress={(m, recipeId) => {
              handleRecipeLongPress(m, recipeId)
              onClose()
            }}
            onFavorite={onFavorite ? (m) => { onFavorite(m); onClose() } : undefined}
            variant={variant}
          />
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  overlayTouch: {
    ...StyleSheet.absoluteFillObject
  },
  centered: {
    width: SCREEN_WIDTH,
    alignItems: 'center',
    marginTop: 40
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: CARD_WIDTH,
    paddingHorizontal: 4,
    marginBottom: 12
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff'
  },
  closeBtn: {
    padding: 4
  }
})


