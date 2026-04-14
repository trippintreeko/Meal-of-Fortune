'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Platform,
  Animated,
  Easing,
  Pressable,
  Alert
} from 'react-native'
import { useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { User, Settings, Heart, LogIn, UserPlus, LogOut, Sun, Moon } from 'lucide-react-native'
import { useThemeColors, useTheme } from '@/hooks/useTheme'
import { useSocialAuth } from '@/hooks/useSocialAuth'
import { useTabHeaderSlide } from '@/hooks/useTabHeaderSlide'
import { getLastFocusedTabIndex } from '@/lib/tab-transition'
import { getDisplayUsername } from '@/lib/username-display'
import SwipeTabsContainer from '@/components/navigation/SwipeTabsContainer'

const PROFILE_TAB_INDEX = 3
const STAGGER_OFFSET = 80
const STAGGER_DURATION = 320
const STAGGER_EASING = Easing.bezier(0.42, 0, 0.58, 1)
const THEME_TRACK_WIDTH = 140
const THEME_THUMB_WIDTH = 70
const THEME_TOGGLE_HEIGHT = 40

export default function ProfileScreen () {
  const router = useRouter()
  const colors = useThemeColors()
  const { themeMode, resolvedTheme, setTheme } = useTheme()
  const { profile, isAuthenticated, loading: authLoading, signOut } = useSocialAuth()
  const isDark = themeMode === 'dark' || (themeMode === 'system' && resolvedTheme === 'dark')
  const themeAnim = useRef(new Animated.Value(isDark ? 1 : 0)).current

  useEffect(() => {
    Animated.timing(themeAnim, {
      toValue: isDark ? 1 : 0,
      duration: 240,
      useNativeDriver: true,
      easing: Easing.bezier(0.42, 0, 0.58, 1)
    }).start()
  }, [isDark, themeAnim])

  const handleThemeToggle = () => {
    const nextDark = !isDark
    setTheme(nextDark ? 'dark' : 'light')
  }

  const headerSlideStyle = useTabHeaderSlide(PROFILE_TAB_INDEX)
  const [sectionFromX, setSectionFromX] = useState(80)
  const slide1 = useRef(new Animated.Value(0)).current
  const slide2 = useRef(new Animated.Value(0)).current
  const slide3 = useRef(new Animated.Value(0)).current
  const slide4 = useRef(new Animated.Value(0)).current
  const profileSlides = [slide1, slide2, slide3, slide4]

  useFocusEffect(
    useCallback(() => {
      const prev = getLastFocusedTabIndex()
      const direction = PROFILE_TAB_INDEX - prev
      const fromX = direction > 0 ? STAGGER_OFFSET : direction < 0 ? -STAGGER_OFFSET : 0
      setSectionFromX(fromX)
      profileSlides.forEach((s) => s.setValue(0))
      const anims = profileSlides.map((s) =>
        Animated.timing(s, {
          toValue: 1,
          duration: STAGGER_DURATION,
          useNativeDriver: true,
          easing: STAGGER_EASING
        })
      )
      Animated.stagger(80, anims).start()
      return () => {
        profileSlides.forEach((s) => s.setValue(0))
      }
    }, [slide1, slide2, slide3, slide4])
  )

  const profileSlideStyle = (s: Animated.Value) => ({
    opacity: s,
    transform: [{ translateX: s.interpolate({ inputRange: [0, 1], outputRange: [sectionFromX, 0] }) }]
  })

  const handleShareFriendCode = () => {
    if (!profile?.friend_code) return
    const message = `Add me on Meal of Fortune! My friend code: ${profile.friend_code}`
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && navigator.share) {
        navigator.share({
          title: 'My Meal of Fortune friend code',
          text: message
        }).catch(() => {
          if (profile?.friend_code) copyToClipboardWeb(profile.friend_code)
        })
      } else {
        copyToClipboardWeb(profile.friend_code)
      }
      return
    }
    Share.share({ message, title: 'My Meal of Fortune friend code' })
  }

  function copyToClipboardWeb (text: string) {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        alert('Friend code copied to clipboard!')
      }).catch(() => {
        alert(`Friend code: ${text}`)
      })
    } else {
      alert(`Friend code: ${text}`)
    }
  }

  return (
    <SwipeTabsContainer tabIndex={PROFILE_TAB_INDEX}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Animated.View style={[styles.headerContent, headerSlideStyle]}>
            <User size={32} color={colors.primary} />
            <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Manage your preferences and settings
            </Text>
          </Animated.View>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <Animated.View style={[styles.section, profileSlideStyle(slide1)]}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Account</Text>
          {authLoading ? (
            <View style={[styles.accountCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : isAuthenticated && profile ? (
            <View style={[styles.accountCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.accountLabel, { color: colors.textMuted }]}>Username</Text>
              <Text style={[styles.accountValue, { color: colors.text }]}>{getDisplayUsername(profile.username)}</Text>
              {profile.email ? (
                <>
                  <Text style={[styles.accountLabel, { color: colors.textMuted }]}>Email</Text>
                  <Text style={[styles.accountValue, { color: colors.text }]}>{profile.email}</Text>
                </>
              ) : null}
              {profile.friend_code ? (
                <>
                  <Text style={[styles.accountLabel, { color: colors.textMuted }]}>Friend code</Text>
                  <View style={styles.friendCodeRow}>
                    <Text style={[styles.friendCodeValue, { color: colors.text }]}>{profile.friend_code}</Text>
                    <TouchableOpacity style={[styles.copyBtn, { backgroundColor: colors.primary }]} onPress={handleShareFriendCode}>
                      <Text style={styles.copyBtnText}>Share</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.friendCodeHint, { color: colors.textMuted }]}>Share this code so friends can add you in Meal of Fortune.</Text>
                </>
              ) : null}
              {profile.dietary_restrictions?.length > 0 ? (
                <>
                  <Text style={[styles.accountLabel, { color: colors.textMuted }]}>Dietary restrictions</Text>
                  <Text style={[styles.accountValue, { color: colors.text }]}>{profile.dietary_restrictions.join(', ')}</Text>
                </>
              ) : null}
              <TouchableOpacity
                style={styles.signOutBtn}
                onPress={() => {
                  Alert.alert(
                    'Sign out?',
                    'Are you sure you want to sign out?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Sign out', style: 'destructive', onPress: () => { void signOut() } }
                    ]
                  )
                }}
              >
                <LogOut size={20} color={colors.destructive} />
                <Text style={[styles.signOutText, { color: colors.destructive }]}>Sign out</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.accountCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.accountPrompt, { color: colors.textMuted }]}>Sign in to sync preferences and use Meal Vote with friends.</Text>
              <TouchableOpacity
                style={[styles.signInBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/social/login')}
              >
                <LogIn size={20} color="#fff" />
                <Text style={styles.signInBtnText}>Sign in</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.registerBtn, { borderColor: colors.primary }]}
                onPress={() => router.push('/social/register')}
              >
                <UserPlus size={20} color={colors.primary} />
                <Text style={[styles.registerBtnText, { color: colors.primary }]}>Create account</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Preferences</Text>
          <Animated.View style={profileSlideStyle(slide2)}>
            <TouchableOpacity
              style={[styles.option, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              onPress={() => router.push('/preferences')}
            >
              <Heart size={24} color={colors.primary} />
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>Food Preferences</Text>
                <Text style={[styles.optionDescription, { color: colors.textMuted }]}>
                  Set your likes and dislikes
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={profileSlideStyle(slide3)}>
            <TouchableOpacity
              style={[styles.option, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              onPress={() => router.push('/profile/settings')}
            >
              <Settings size={24} color={colors.textMuted} />
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>Settings</Text>
                <Text style={[styles.optionDescription, { color: colors.textMuted }]}>
                  App preferences and account
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={profileSlideStyle(slide4)}>
          <View style={[styles.themeRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.themeLabel, { color: colors.textMuted }]}>Theme</Text>
            <Pressable
              onPress={handleThemeToggle}
              style={[styles.themeTrack, { backgroundColor: colors.border }]}
            >
              <View style={styles.themeTrackLabels}>
                <View style={styles.themeTrackHalf}>
                  <Text style={[styles.themeTrackText, { color: colors.textMuted }]}>Night</Text>
                </View>
                <View style={styles.themeTrackHalf}>
                  <Text style={[styles.themeTrackText, { color: colors.textMuted }]}>Day</Text>
                </View>
              </View>
              <Animated.View
                style={[
                  styles.themeThumb,
                  {
                    backgroundColor: colors.primary,
                    transform: [
                      {
                        translateX: themeAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, THEME_THUMB_WIDTH]
                        })
                      }
                    ]
                  }
                ]}
              >
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.themeThumbIcon,
                    { opacity: themeAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }
                  ]}
                >
                  <Sun size={20} color="#fff" />
                </Animated.View>
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.themeThumbIcon,
                    StyleSheet.absoluteFillObject,
                    { opacity: themeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }
                  ]}
                >
                  <Moon size={20} color="#fff" />
                </Animated.View>
              </Animated.View>
            </Pressable>
          </View>
          </Animated.View>
        </View>
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
    padding: 20,
    paddingBottom: 40
  },
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 10
  },
  accountCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  accountLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 12
  },
  accountValue: {
    fontSize: 15,
    color: '#1e293b',
    marginTop: 2
  },
  accountPrompt: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 14
  },
  friendCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4
  },
  friendCodeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b'
  },
  copyBtn: {
    backgroundColor: '#22c55e',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8
  },
  copyBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14
  },
  friendCodeHint: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 6
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 12
  },
  signOutText: {
    color: '#dc2626',
    fontWeight: '600',
    fontSize: 15
  },
  signInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#22c55e',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10
  },
  signInBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16
  },
  registerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#bbf7d0'
  },
  registerBtnText: {
    color: '#22c55e',
    fontWeight: '600',
    fontSize: 16
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  optionText: {
    marginLeft: 16,
    flex: 1
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b'
  },
  optionDescription: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  themeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b'
  },
  themeTrack: {
    width: THEME_TRACK_WIDTH,
    height: THEME_TOGGLE_HEIGHT,
    borderRadius: THEME_TOGGLE_HEIGHT / 2,
    overflow: 'hidden',
    justifyContent: 'center'
  },
  themeTrackLabels: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row'
  },
  themeTrackHalf: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: THEME_THUMB_WIDTH
  },
  themeTrackText: {
    fontSize: 13,
    fontWeight: '600'
  },
  themeThumb: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: THEME_THUMB_WIDTH,
    height: THEME_TOGGLE_HEIGHT,
    borderRadius: THEME_TOGGLE_HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  themeThumbIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: THEME_THUMB_WIDTH,
    height: THEME_TOGGLE_HEIGHT
  }
})
