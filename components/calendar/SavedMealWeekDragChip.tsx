'use client'

import { useMemo, useCallback, useRef } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { runOnJS } from 'react-native-reanimated'
import { Plus } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import type { SavedMeal } from '@/types/calendar'

type Colors = {
  card: string
  cardBorder: string
  primary: string
  text: string
}

export function SavedMealWeekDragChip ({
  meal,
  colors,
  onTap,
  onDragStart,
  onDragMove,
  onDragEnd
}: {
  meal: SavedMeal
  colors: Colors
  onTap: () => void
  onDragStart: (meal: SavedMeal) => void
  onDragMove: (ax: number, ay: number) => void
  onDragEnd: () => void
}) {
  const endOnce = useRef(false)

  const start = useCallback(() => {
    endOnce.current = false
    onDragStart(meal)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {})
  }, [meal, onDragStart])

  const move = useCallback(
    (ax: number, ay: number) => {
      onDragMove(ax, ay)
    },
    [onDragMove]
  )

  const end = useCallback(() => {
    if (endOnce.current) return
    endOnce.current = true
    onDragEnd()
  }, [onDragEnd])

  const tap = useCallback(() => {
    onTap()
  }, [onTap])

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .activateAfterLongPress(420)
      .onStart(() => {
        runOnJS(start)()
      })
      .onUpdate((e) => {
        runOnJS(move)(e.absoluteX, e.absoluteY)
      })
      .onEnd(() => {
        runOnJS(end)()
      })
    const tapG = Gesture.Tap()
      .maxDuration(300)
      .onEnd(() => {
        runOnJS(tap)()
      })
    return Gesture.Exclusive(pan, tapG)
  }, [start, move, end, tap])

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
      >
        <View style={styles.chipContent}>
          <Plus size={18} color={colors.primary} />
          <Text style={[styles.chipText, { color: colors.text }]} numberOfLines={2}>
            {meal.title || 'Untitled meal'}
          </Text>
        </View>
      </View>
    </GestureDetector>
  )
}

const styles = StyleSheet.create({
  chip: {
    width: 140,
    minHeight: 72,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 10
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  chipText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600'
  }
})
