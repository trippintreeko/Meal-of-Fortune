import { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Image,
  Linking
} from 'react-native'
import { useRouter } from 'expo-router'
import { X, CalendarPlus, UtensilsCrossed, Share2, Heart, BookOpen, MapPin } from 'lucide-react-native'
import { supabase } from '@/lib/supabase'
import type { SavedMeal } from '@/types/calendar'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const CARD_WIDTH = SCREEN_WIDTH * 0.88

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

function MealDetailCard ({
  meal,
  onShareForVotes,
  onAddToCalendar,
  onFavorite,
  variant = 'saved',
  onRecipe,
  onMealNearMe
}: {
  meal: SavedMeal
  onShareForVotes: (meal: SavedMeal) => void
  onAddToCalendar: (meal: SavedMeal) => void
  onFavorite?: (meal: SavedMeal) => void
  variant?: 'saved' | 'mealOfTheDay'
  onRecipe: (meal: SavedMeal, recipeId: string | null) => void
  onMealNearMe: (meal: SavedMeal) => void
}) {
  const [description, setDescription] = useState<string | null>(null)
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [recipeId, setRecipeId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        const { data } = await supabase
          .from('gallery_meals')
          .select('id, description, image_urls')
          .eq('base_id', meal.baseId)
          .eq('protein_id', meal.proteinId)
          .eq('vegetable_id', meal.vegetableId)
          .ilike('title', meal.title.trim())
          .limit(1)
        if (cancelled) return
        const rows = data as { id: string; description: string | null; image_urls: string[] | null }[] | null
        const row = rows?.[0]
        setRecipeId(row?.id ?? null)
        setDescription(row?.description ?? null)
        setImageUrls(Array.isArray(row?.image_urls) ? row.image_urls : [])
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
  }, [meal.id, meal.baseId, meal.proteinId, meal.vegetableId, meal.title])

  const hasImages = imageUrls.length > 0
  return (
    <View style={cardStyles.card}>
      {hasImages
        ? (
          <View style={cardStyles.imageWrap}>
            <Image source={{ uri: imageUrls[0] }} style={cardStyles.imageHero} resizeMode="cover" />
            {imageUrls.length > 1 && (
              <View style={cardStyles.imageStrip}>
                {imageUrls.slice(1, 3).map((url, idx) => (
                  <Image key={idx} source={{ uri: url }} style={cardStyles.imageThumb} resizeMode="cover" />
                ))}
              </View>
            )}
          </View>
          )
        : (
          <View style={cardStyles.imagePlaceholder}>
            <UtensilsCrossed size={48} color="rgba(255,255,255,0.8)" />
          </View>
          )}
      <Text style={cardStyles.title} numberOfLines={2}>{meal.title}</Text>
      {loading ? (
        <ActivityIndicator size="small" color="#22c55e" style={cardStyles.loader} />
      ) : description ? (
        <Text style={cardStyles.description} numberOfLines={6}>{description}</Text>
      ) : null}

      <View style={cardStyles.actionsRow}>
        {variant === 'mealOfTheDay' && onFavorite ? (
          <TouchableOpacity
            style={[cardStyles.rowBtn, cardStyles.rowBtnFavorite]}
            onPress={() => onFavorite(meal)}>
            <Heart size={20} color="#ffffff" />
            <Text style={[cardStyles.rowBtnText, cardStyles.rowBtnTextFavorite]}>Favorite</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={cardStyles.rowBtn}
            onPress={() => onRecipe(meal, recipeId)}>
            <BookOpen size={20} color="#f59e0b" />
            <Text style={cardStyles.rowBtnText}>Recipe</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={cardStyles.rowBtn}
          onPress={() => onMealNearMe(meal)}>
          <MapPin size={20} color="#0ea5e9" />
          <Text style={cardStyles.rowBtnText}>Near me</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[cardStyles.rowBtn, cardStyles.rowBtnAdd]}
          onPress={() => onAddToCalendar(meal)}>
          <CalendarPlus size={20} color="#ffffff" />
          <Text style={[cardStyles.rowBtnText, cardStyles.rowBtnTextAdd]}>Add</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={cardStyles.rowBtn}
          onPress={() => onShareForVotes(meal)}>
          <Share2 size={20} color="#6366f1" />
          <Text style={cardStyles.rowBtnText}>Share</Text>
        </TouchableOpacity>
      </View>
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
  imagePlaceholder: {
    height: 160,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center'
  },
  imageWrap: {
    paddingHorizontal: 0
  },
  imageHero: {
    width: '100%',
    height: 160,
    backgroundColor: '#22c55e'
  },
  imageStrip: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4
  },
  imageThumb: {
    flex: 1,
    height: 56,
    borderRadius: 8
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    paddingHorizontal: 20,
    paddingTop: 16
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

  const handleMealNearMe = (m: SavedMeal) => {
    const query = `${m.title.trim()} near me`
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`
    void Linking.openURL(url)
  }

  const handleRecipe = (m: SavedMeal, recipeId: string | null) => {
    if (recipeId) {
      router.push(`/recipe/${recipeId}`)
      return
    }
    const url = `https://www.google.com/search?q=${encodeURIComponent(`${m.title} recipe`)}`
    void Linking.openURL(url)
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.overlayTouch} activeOpacity={1} onPress={onClose} />
        <View style={styles.centered} pointerEvents="box-none">
          <View style={styles.header}>
            <Text style={styles.title}>{variant === 'mealOfTheDay' ? 'Meal of the day' : 'Meals I want'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={26} color="#ffffff" />
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
