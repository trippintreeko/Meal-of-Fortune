import { useRef } from 'react'
import { View, Text, StyleSheet, Animated, PanResponder, Dimensions, Image } from 'react-native'
import { X, Heart } from 'lucide-react-native'
import type { ThemeColors } from '@/lib/theme-colors'
import { LIGHT_COLORS } from '@/lib/theme-colors'

const SCREEN_WIDTH = Dimensions.get('window').width
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25

export type MealCardDisplay = {
  title: string
  description?: string
  cookingMethod?: string
  /** Spoonacular or gallery recipe image URL */
  imageUrl?: string | null
}

type SwipeCardProps = {
  cardDisplay: MealCardDisplay
  onSwipe: (direction: 'left' | 'right') => void
  isTop: boolean
  themeColors?: ThemeColors
}

export default function SwipeCard ({ cardDisplay, onSwipe, isTop, themeColors = LIGHT_COLORS }: SwipeCardProps) {
  const c = themeColors
  const position = useRef(new Animated.ValueXY()).current;
  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-30deg', '0deg', '30deg'],
    extrapolate: 'clamp',
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const nopeOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const isTopRef = useRef(isTop)
  isTopRef.current = isTop

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isTopRef.current,
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          forceSwipe('right');
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          forceSwipe('left');
        } else {
          resetPosition();
        }
      },
    })
  ).current;

  const forceSwipe = (direction: 'left' | 'right') => {
    const x = direction === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;
    Animated.timing(position, {
      toValue: { x, y: 0 },
      duration: 250,
      useNativeDriver: true,
    }).start(() => onSwipe(direction));
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: true,
    }).start();
  };

  const cardStyle = {
    transform: [
      { translateX: position.x },
      { translateY: position.y },
      { rotate },
    ],
  };

  return (
    <Animated.View
      style={[
        styles.card,
        { backgroundColor: c.card },
        cardStyle,
        !isTop && styles.cardBehind,
        { zIndex: isTop ? 100 : 1, elevation: isTop ? 10 : 1 }
      ]}
      {...panResponder.panHandlers}
      pointerEvents={isTop ? 'auto' : 'none'}>
      <Animated.View style={[styles.likeLabel, { opacity: likeOpacity, borderColor: c.primary }]}>
        <Heart size={32} color={c.primary} fill={c.primary} />
        <Text style={[styles.likeLabelText, { color: c.primary }]}>LIKE</Text>
      </Animated.View>

      <Animated.View style={[styles.nopeLabel, { opacity: nopeOpacity, borderColor: c.destructive }]}>
        <X size={32} color={c.destructive} />
        <Text style={[styles.nopeLabelText, { color: c.destructive }]}>NOPE</Text>
      </Animated.View>

      <View style={[styles.imageSection, { backgroundColor: c.secondaryBg }]}>
        {cardDisplay.imageUrl ? (
          <Image source={{ uri: cardDisplay.imageUrl }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholderInner}>
            <Text style={styles.imagePlaceholderEmoji}>🍽</Text>
          </View>
        )}
      </View>
      <View style={[styles.mealInfo, { backgroundColor: c.card }]}>
        <Text style={[styles.mealTitle, { color: c.text }]} numberOfLines={2}>{cardDisplay.title}</Text>
        {cardDisplay.description ? (
          <Text style={[styles.mealDescription, { color: c.textMuted }]} numberOfLines={2}>{cardDisplay.description}</Text>
        ) : null}
        {cardDisplay.cookingMethod ? (
          <Text style={[styles.cookingMethod, { color: c.textMuted }]}>Cooking method: {cardDisplay.cookingMethod}</Text>
        ) : null}
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: SCREEN_WIDTH - 40,
    height: 500,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  cardBehind: {
    opacity: 0.8,
  },
  likeLabel: {
    position: 'absolute',
    top: 40,
    right: 40,
    borderWidth: 4,
    borderRadius: 8,
    padding: 12,
    transform: [{ rotate: '15deg' }],
    alignItems: 'center',
    zIndex: 10,
  },
  likeLabelText: { fontSize: 20, fontWeight: '700', marginTop: 4 },
  nopeLabel: {
    position: 'absolute',
    top: 40,
    left: 40,
    borderWidth: 4,
    borderColor: '#ef4444',
    borderRadius: 8,
    padding: 12,
    transform: [{ rotate: '-15deg' }],
    alignItems: 'center',
    zIndex: 10,
  },
  nopeLabelText: { fontSize: 20, fontWeight: '700', marginTop: 4 },
  imageSection: {
    flex: 1,
    minHeight: 320,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholderInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderEmoji: { fontSize: 72 },
  mealInfo: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  mealTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
    textTransform: 'capitalize',
  },
  mealDescription: { fontSize: 14, textAlign: 'center', marginBottom: 4 },
  cookingMethod: { fontSize: 13, textAlign: 'center', fontStyle: 'italic' },
});
