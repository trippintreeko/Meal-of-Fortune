'use client'

import { useEffect, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Modal,
  Image,
  Share,
  Platform,
  Alert,
  Dimensions
} from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { X, Share2 } from 'lucide-react-native'

const { width: SW, height: SH } = Dimensions.get('window')

function clamp (n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

export function MealImageFullscreenViewer ({
  visible,
  imageUrl,
  onClose
}: {
  visible: boolean
  imageUrl: string | null
  onClose: () => void
}) {
  const scale = useSharedValue(1)
  const saved = useSharedValue(1)
  const pinch = useMemo(() => Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = clamp(saved.value * e.scale, 1, 6)
    })
    .onEnd(() => {
      saved.value = scale.value
    }), [scale, saved])
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: withTiming(scale.value, { duration: 0 }) }]
  }))

  useEffect(() => {
    if (!visible) {
      scale.value = 1
      saved.value = 1
    }
  }, [visible, scale, saved])

  const shareImage = async () => {
    if (!imageUrl) return
    try {
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(imageUrl)
          Alert.alert('Copied', 'Image link copied to clipboard.')
        }
        return
      }
      await Share.share(
        Platform.OS === 'ios'
          ? { url: imageUrl }
          : { message: imageUrl }
      )
    } catch {
      Alert.alert('Share', 'Could not share this image.')
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.iconBtn} onPress={onClose} accessibilityLabel="Close full screen image">
            <X size={28} color="#ffffff" />
          </TouchableOpacity>
          {imageUrl
            ? (
              <TouchableOpacity style={styles.iconBtn} onPress={() => void shareImage()} accessibilityLabel="Share image">
                <Share2 size={26} color="#ffffff" />
              </TouchableOpacity>
              )
            : <View style={styles.iconBtn} />}
        </View>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.center} pointerEvents="box-none">
          <GestureDetector gesture={pinch}>
            <Animated.View style={[styles.frame, style]}>
              {imageUrl
                ? (
                  <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="contain" />
                  )
                : (
                  <Text style={styles.missing}>No image</Text>
                  )}
            </Animated.View>
          </GestureDetector>
        </View>
        <Text style={styles.hint}>Pinch to zoom</Text>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.94)'
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 2
  },
  iconBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center'
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1
  },
  frame: {
    width: SW,
    height: SH * 0.65,
    justifyContent: 'center',
    alignItems: 'center'
  },
  image: {
    width: '100%',
    height: '100%'
  },
  missing: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16
  },
  hint: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.45)',
    fontSize: 13,
    paddingBottom: 28
  }
})
