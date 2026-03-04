'use client'

import { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import {
  ChevronLeft,
  Bell,
  Shield,
  UserCog,
  HelpCircle,
  Image as ImageIcon
} from 'lucide-react-native'
import { useThemeColors } from '@/hooks/useTheme'
import { useSocialAuth } from '@/hooks/useSocialAuth'
import { useProfileSettings } from '@/hooks/useProfileSettings'
import { useAvatarUpload } from '@/hooks/useAvatarUpload'
import { supabase } from '@/lib/supabase'
import ProfileHeader from '@/components/profile/ProfileHeader'
import SettingsList from '@/components/profile/SettingsList'
import FoodAvatarPicker from '@/components/profile/FoodAvatarPicker'
import type { SettingsItem } from '@/components/profile/SettingsItem'
import { FOOD_AVATAR_PREFIX, getFoodAvatarKey } from '@/lib/avatar-food-asset'
import type { FoodAssetKey } from '@/lib/food-asset-mapping'

export default function ProfileSettingsScreen () {
  const router = useRouter()
  const { profile, isAuthenticated, refreshProfile } = useSocialAuth()
  const authId = profile?.auth_id ?? undefined
  const { updateProfile } = useProfileSettings(authId, profile, refreshProfile)
  const { uploadAvatar, uploading: avatarUploading } = useAvatarUpload(authId)
  const colors = useThemeColors()
  const [counts, setCounts] = useState({ groupsCount: 0, friendsCount: 0 })
  const [foodPickerVisible, setFoodPickerVisible] = useState(false)

  const loadCounts = useCallback(async () => {
    if (!isAuthenticated) return
    const client = (await import('@/lib/supabase')).supabase
    const { data, error } = await client.rpc('get_profile_counts')
    if (error || !data) return
    const row = Array.isArray(data) ? data[0] : data
    if (row && typeof row.groups_count === 'number' && typeof row.friends_count === 'number') {
      setCounts({ groupsCount: row.groups_count, friendsCount: row.friends_count })
    } else if (row) {
      setCounts({
        groupsCount: Number(row.groups_count) || 0,
        friendsCount: Number(row.friends_count) || 0
      })
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (isAuthenticated) void loadCounts()
  }, [isAuthenticated, loadCounts])

  const handleEditAvatar = async () => {
    if (!isAuthenticated) return
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your photos to choose a profile picture.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8
    })
    if (result.canceled || !result.assets?.[0]?.uri) return
    let uri = result.assets[0].uri
    try {
      const cropped = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 400, height: 400 } }], { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG })
      uri = cropped.uri
    } catch (_) {}
    const { url, error } = await uploadAvatar(uri)
    if (error) {
      Alert.alert(
        'Upload failed',
        'Gallery upload failed (often due to network or storage config). You can choose a food avatar below instead.',
        [{ text: 'OK' }]
      )
      return
    }
    if (url) {
      const { error: updateErr } = await updateProfile({ avatar_url: url })
      if (updateErr) Alert.alert('Update failed', updateErr)
      else refreshProfile()
    }
  }

  const handleCopyFriendCode = () => {
    if (profile?.friend_code) {
      Alert.alert('Friend code', profile.friend_code, [{ text: 'OK' }])
    }
  }


  const handleFoodAvatarSelect = async (key: FoodAssetKey) => {
    const { error: updateErr } = await updateProfile({ avatar_url: `${FOOD_AVATAR_PREFIX}${key}` })
    if (updateErr) Alert.alert('Update failed', updateErr)
    else {
      refreshProfile()
      setFoodPickerVisible(false)
    }
  }

  const sectionItems: SettingsItem[] = [
    { id: 'food-avatar', icon: ImageIcon, title: 'Choose food avatar', description: 'Use a food image as your profile picture', type: 'link', onPress: () => setFoodPickerVisible(true) },
    { id: 'notifications', icon: Bell, title: 'Notifications', description: 'Reminders, votes, quiet hours', type: 'link', onPress: () => router.push('/profile/settings/notifications') },
    { id: 'privacy', icon: Shield, title: 'Privacy', description: 'Visibility, search, data', type: 'link', onPress: () => router.push('/profile/settings/privacy') },
    { id: 'account', icon: UserCog, title: 'Account', description: 'Email, password, 2FA, delete', type: 'link', onPress: () => router.push('/profile/settings/account') },
    { id: 'help', icon: HelpCircle, title: 'Help & Support', description: 'FAQ, contact, licenses', type: 'link', onPress: () => router.push('/profile/settings/help') }
  ]

  if (!isAuthenticated || !profile) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.centered}>
          <Text style={[styles.prompt, { color: colors.textMuted }]}>Sign in to manage settings.</Text>
        </View>
      </View>
    )
  }

  const joinDate = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : ''

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} accessibilityLabel="Back">
        <ChevronLeft size={24} color={colors.text} />
      </TouchableOpacity>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ProfileHeader
          avatarUri={profile.avatar_url}
          avatarSeed={profile.auth_id}
          username={profile.username}
          friendCode={profile.friend_code}
          groupsCount={counts.groupsCount}
          friendsCount={counts.friendsCount}
          uploading={avatarUploading}
          onEditAvatar={() => setFoodPickerVisible(true)}
          onEditUsername={() => router.push('/profile/settings/edit-profile')}
          onCopyFriendCode={handleCopyFriendCode}
          themeColors={colors}
        />
        {profile.bio ? <Text style={[styles.bio, { color: colors.textMuted }]}>{profile.bio}</Text> : null}
        {joinDate ? <Text style={[styles.joinDate, { color: colors.textMuted }]}>Joined {joinDate}</Text> : null}
        <View style={styles.section}>
          <SettingsList title="Settings" items={sectionItems} themeColors={colors} />
        </View>
      </ScrollView>
      <FoodAvatarPicker
        visible={foodPickerVisible}
        onClose={() => setFoodPickerVisible(false)}
        onSelect={handleFoodAvatarSelect}
        selectedKey={getFoodAvatarKey(profile.avatar_url)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  backBtn: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10
  },
  scroll: {
    paddingTop: 16,
    paddingBottom: 40
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  prompt: {
    fontSize: 16,
    color: '#64748b'
  },
  bio: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginTop: 8
  },
  joinDate: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 16
  }
})
