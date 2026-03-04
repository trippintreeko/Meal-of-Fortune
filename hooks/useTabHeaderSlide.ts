import { useRef, useCallback } from 'react'
import { Animated, Easing } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { getLastFocusedTabIndex, setLastFocusedTabIndex } from '@/lib/tab-transition'

const SLIDE_OFFSET = 80
const SLIDE_DURATION = 320
const SLIDE_EASING = Easing.bezier(0.42, 0, 0.58, 1)

/**
 * Use in tab screens with a header (Calendar=1, Social=2, Profile=3).
 * Header slides in from the direction of the previous tab (80px offset) while fading in, matching Meals I want animation.
 */
export function useTabHeaderSlide (tabIndex: number): Animated.AnimatedProps<{ style: object }>['style'] {
  const slideX = useRef(new Animated.Value(0)).current
  const opacity = useRef(new Animated.Value(1)).current

  useFocusEffect(
    useCallback(() => {
      const prev = getLastFocusedTabIndex()
      const direction = tabIndex - prev
      // Only update last index on cleanup so other hooks (e.g. section stagger) can read prev

      if (direction === 0) {
        slideX.setValue(0)
        opacity.setValue(1)
        return
      }

      const fromX = direction > 0 ? SLIDE_OFFSET : -SLIDE_OFFSET
      slideX.setValue(fromX)
      opacity.setValue(0)

      Animated.parallel([
        Animated.timing(slideX, {
          toValue: 0,
          duration: SLIDE_DURATION,
          useNativeDriver: true,
          easing: SLIDE_EASING
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: SLIDE_DURATION,
          useNativeDriver: true,
          easing: SLIDE_EASING
        })
      ]).start()

      return () => {
        setLastFocusedTabIndex(tabIndex)
      }
    }, [tabIndex, slideX, opacity])
  )

  return {
    opacity,
    transform: [{ translateX: slideX }]
  }
}
