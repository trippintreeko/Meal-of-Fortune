import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native'
import { X, UtensilsCrossed } from 'lucide-react-native'
import { useThemeColors } from '@/hooks/useTheme'
import type { SavedMeal } from '@/types/calendar'

type PickSavedMealModalProps = {
  visible: boolean
  savedMeals: SavedMeal[]
  onClose: () => void
  onSelect: (meal: SavedMeal) => void
}

export default function PickSavedMealModal ({
  visible,
  savedMeals,
  onClose,
  onSelect
}: PickSavedMealModalProps) {
  const colors = useThemeColors()

  const sheetStyle = [styles.sheet, { backgroundColor: colors.card }]
  const headerBorderStyle = { borderBottomColor: colors.border }
  const titleStyle = [styles.title, { color: colors.text }]
  const emptyTextStyle = [styles.emptyText, { color: colors.textMuted }]
  const mealRowStyle = [styles.mealRow, { backgroundColor: colors.secondaryBg, borderColor: colors.cardBorder }]
  const mealRowTextStyle = [styles.mealRowText, { color: colors.text }]

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
          accessibilityLabel="Close modal"
          accessibilityRole="button"
        />
        <View style={sheetStyle} pointerEvents="box-none">
          <View style={[styles.header, headerBorderStyle]}>
            <Text style={titleStyle}>Add meal to this day</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          {savedMeals.length === 0 ? (
            <Text style={emptyTextStyle}>No saved meals. Save a meal from the game or gallery first.</Text>
          ) : (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}>
              {savedMeals.map((meal) => (
                <TouchableOpacity
                  key={meal.id}
                  style={mealRowStyle}
                  onPress={() => onSelect(meal)}
                  activeOpacity={0.7}>
                  <UtensilsCrossed size={22} color={colors.primary} />
                  <Text style={mealRowTextStyle} numberOfLines={2}>{meal.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end'
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 24
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1
  },
  title: {
    fontSize: 18,
    fontWeight: '700'
  },
  closeBtn: { padding: 4 },
  emptyText: {
    padding: 24,
    fontSize: 15,
    textAlign: 'center'
  },
  scroll: {
    maxHeight: 320
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1
  },
  mealRowText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1
  }
})
