import { useRef, useCallback, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Easing } from 'react-native'
import { useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { Users, Bell, UserPlus } from 'lucide-react-native'
import { useThemeColors } from '@/hooks/useTheme'
import { useSocialAuth } from '@/hooks/useSocialAuth'
import { useTabHeaderSlide } from '@/hooks/useTabHeaderSlide'
import { getLastFocusedTabIndex } from '@/lib/tab-transition'
import SwipeTabsContainer from '@/components/navigation/SwipeTabsContainer'

const SOCIAL_TAB_INDEX = 2
const STAGGER_OFFSET = 80
const STAGGER_DURATION = 320
const STAGGER_EASING = Easing.bezier(0.42, 0, 0.58, 1)

export default function SocialScreen () {
  const router = useRouter()
  const colors = useThemeColors()
  const { isAuthenticated, profile, loading } = useSocialAuth()
  const headerSlideStyle = useTabHeaderSlide(SOCIAL_TAB_INDEX)
  const [sectionFromX, setSectionFromX] = useState(80)
  const slide1 = useRef(new Animated.Value(0)).current
  const slide2 = useRef(new Animated.Value(0)).current
  const slide3 = useRef(new Animated.Value(0)).current
  const slide4 = useRef(new Animated.Value(0)).current
  const slide5 = useRef(new Animated.Value(0)).current

  const sectionCount = isAuthenticated ? (profile?.friend_code ? 5 : 4) : 3
  const slides = [slide1, slide2, slide3, slide4, slide5]

  useFocusEffect(
    useCallback(() => {
      const prev = getLastFocusedTabIndex()
      const direction = SOCIAL_TAB_INDEX - prev
      const fromX = direction > 0 ? STAGGER_OFFSET : direction < 0 ? -STAGGER_OFFSET : 0
      setSectionFromX(fromX)
      slides.forEach((s) => s.setValue(0))
      const anims = slides.slice(0, sectionCount).map((s) =>
        Animated.timing(s, {
          toValue: 1,
          duration: STAGGER_DURATION,
          useNativeDriver: true,
          easing: STAGGER_EASING
        })
      )
      if (anims.length > 0) Animated.stagger(80, anims).start()
      return () => {
        slides.forEach((s) => s.setValue(0))
      }
    }, [sectionCount, slide1, slide2, slide3, slide4, slide5])
  )

  if (loading) return null

  const slideStyle = (s: Animated.Value) => ({
    opacity: s,
    transform: [{ translateX: s.interpolate({ inputRange: [0, 1], outputRange: [sectionFromX, 0] }) }]
  })

  return (
    <SwipeTabsContainer tabIndex={SOCIAL_TAB_INDEX}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Animated.View style={[styles.headerContent, headerSlideStyle]}>
            <Users size={32} color={colors.primary} />
            <Text style={[styles.title, { color: colors.text }]}>Meal of Fortune</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Vote with friends and family on what to eat
            </Text>
          </Animated.View>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          {isAuthenticated ? (
            <>
            {profile?.friend_code ? (
              <Animated.View style={slideStyle(slide1)}>
                <View style={[styles.codeCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <Text style={[styles.codeLabel, { color: colors.textMuted }]}>Your friend code</Text>
                  <Text style={[styles.codeValue, { color: colors.text }]}>{profile.friend_code}</Text>
                </View>
              </Animated.View>
            ) : null}
            <Animated.View style={slideStyle(profile?.friend_code ? slide2 : slide1)}>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/social/groups')}
              >
                <Users size={24} color="#fff" />
                <Text style={styles.primaryButtonText}>My groups</Text>
              </TouchableOpacity>
            </Animated.View>
            <Animated.View style={slideStyle(profile?.friend_code ? slide3 : slide2)}>
              <TouchableOpacity
                style={[styles.secondaryButton, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                onPress={() => router.push('/social/friends/list')}
              >
                <Users size={22} color={colors.textMuted} />
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Friends</Text>
              </TouchableOpacity>
            </Animated.View>
            <Animated.View style={slideStyle(profile?.friend_code ? slide4 : slide3)}>
              <TouchableOpacity
                style={[styles.secondaryButton, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                onPress={() => router.push('/social/add-friend')}
              >
                <UserPlus size={22} color={colors.textMuted} />
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Add friend</Text>
              </TouchableOpacity>
            </Animated.View>
            <Animated.View style={slideStyle(profile?.friend_code ? slide5 : slide4)}>
              <TouchableOpacity
                style={[styles.secondaryButton, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                onPress={() => router.push('/social/notifications')}
              >
                <Bell size={22} color={colors.textMuted} />
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Notifications</Text>
              </TouchableOpacity>
            </Animated.View>
          </>
        ) : (
          <>
            <Animated.View style={slideStyle(slide1)}>
              <Text style={[styles.paragraph, { color: colors.textMuted }]}>
                Sign in to create meal groups, start voting sessions, and decide together what to eat.
              </Text>
            </Animated.View>
            <Animated.View style={slideStyle(slide2)}>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/social/login')}
              >
                <Text style={styles.primaryButtonText}>Sign in</Text>
              </TouchableOpacity>
            </Animated.View>
            <Animated.View style={slideStyle(slide3)}>
              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: colors.primary }]}
                onPress={() => router.push('/social/register')}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>Create account</Text>
              </TouchableOpacity>
            </Animated.View>
          </>
          )}
        </ScrollView>
      </View>
    </SwipeTabsContainer>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    overflow: 'hidden'
  },
  headerContent: {
    alignItems: 'center'
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 6
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2
  },
  content: {
    padding: 20
  },
  codeCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#bbf7d0'
  },
  codeLabel: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '600'
  },
  codeValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 4
  },
  errorCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#fecaca'
  },
  errorText: {
    fontSize: 14,
    color: '#991b1b'
  },
  paragraph: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#22c55e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700'
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  secondaryButtonText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600'
  }
})
