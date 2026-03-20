import { View, Text, StyleSheet, Modal, TouchableOpacity, Linking, Dimensions } from 'react-native'
import { useRouter } from 'expo-router'
import { X } from 'lucide-react-native'
import { MealDetailCard } from '@/components/MealDetailModal'
import { useThemeColors } from '@/hooks/useTheme'
import type { SavedMeal } from '@/types/calendar'
import { getRecipeSearchUrl } from '@/lib/recipes/search'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const CARD_WIDTH = SCREEN_WIDTH * 0.88

type Props = {
  visible: boolean
  meal: SavedMeal | null
  onClose: () => void
}

export default function WeekPlannerMealModal ({ visible, meal, onClose }: Props) {
  const router = useRouter()
  const colors = useThemeColors()

  if (!visible || !meal) return null

  const handleRecipe = (m: SavedMeal, recipeGalleryId: string | null) => {
    onClose()
    if (recipeGalleryId) {
      router.push(`/recipe/${recipeGalleryId}`)
      return
    }
    void Linking.openURL(getRecipeSearchUrl(m.title))
  }

  const handleGrocery = (m: SavedMeal, recipeGalleryId: string | null) => {
    onClose()
    if (recipeGalleryId) {
      router.push(`/recipe/${recipeGalleryId}?grocery=1`)
      return
    }
    void Linking.openURL(
      `https://www.google.com/search?q=${encodeURIComponent(`${m.title} ingredients grocery list`)}`
    )
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: colors.background === '#0f172a' ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.5)' }]}>
        <TouchableOpacity style={styles.overlayTouch} activeOpacity={1} onPress={onClose} />
        <View style={styles.centered} pointerEvents="box-none">
          <View style={styles.header}>
            <Text style={[styles.title, { color: '#f1f5f9' }]}>Meal</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close">
              <X size={26} color="#f1f5f9" />
            </TouchableOpacity>
          </View>
          <MealDetailCard
            meal={meal}
            variant="weekPlanner"
            onRecipe={handleRecipe}
            onGroceryList={handleGrocery}
          />
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  overlayTouch: {
    ...StyleSheet.absoluteFillObject
  },
  centered: {
    width: SCREEN_WIDTH,
    alignItems: 'center',
    marginTop: 36
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
    fontWeight: '700'
  },
  closeBtn: {
    padding: 4
  }
})
