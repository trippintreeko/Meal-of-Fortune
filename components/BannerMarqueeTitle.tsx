import { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  type StyleProp,
  type TextStyle
} from 'react-native'

const END_PAUSE_MS = 1000
const START_PAUSE_MS = 900
const RESET_MS = 450

type BannerMarqueeTitleProps = {
  text: string
  style?: StyleProp<TextStyle>
}

/**
 * Single-line title; if wider than the container, scrolls horizontally (marquee) to show the rest.
 */
export function BannerMarqueeTitle ({ text, style }: BannerMarqueeTitleProps) {
  const [containerW, setContainerW] = useState(0)
  const [textW, setTextW] = useState(0)
  const scrollX = useRef(new Animated.Value(0)).current
  const loopRef = useRef<Animated.CompositeAnimation | null>(null)

  useEffect(() => {
    setTextW(0)
  }, [text])

  const needsScroll = textW > containerW && containerW > 0 && textW > 0
  const gap = 12
  const distance = Math.max(0, textW - containerW + gap)

  useEffect(() => {
    scrollX.setValue(0)
    if (loopRef.current) {
      loopRef.current.stop()
      loopRef.current = null
    }
    if (!needsScroll || distance <= 0) return

    const scrollMs = Math.min(14000, Math.max(2800, distance * 42))

    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(START_PAUSE_MS),
        Animated.timing(scrollX, {
          toValue: -distance,
          duration: scrollMs,
          easing: Easing.linear,
          useNativeDriver: true
        }),
        Animated.delay(END_PAUSE_MS),
        Animated.timing(scrollX, {
          toValue: 0,
          duration: RESET_MS,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true
        })
      ])
    )
    loopRef.current = loop
    loop.start()

    return () => {
      loop.stop()
      loopRef.current = null
    }
  }, [needsScroll, distance, text, scrollX])

  return (
    <View
      style={styles.clip}
      onLayout={(e) => setContainerW(e.nativeEvent.layout.width)}
    >
      <Animated.View style={{ transform: [{ translateX: scrollX }] }}>
        <Text
          style={[style, styles.singleLine]}
          numberOfLines={1}
          onLayout={(e) => setTextW(e.nativeEvent.layout.width)}
        >
          {text}
        </Text>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  clip: {
    width: '100%',
    overflow: 'hidden',
    minHeight: 22
  },
  singleLine: {
    flexShrink: 0,
    alignSelf: 'flex-start'
  }
})
