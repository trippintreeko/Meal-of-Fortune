import { Stack } from 'expo-router'
import { useTheme } from '@/contexts/ThemeContext'
import { getThemeColors } from '@/lib/theme-colors'

export default function SocialLayout () {
  const { resolvedTheme } = useTheme()
  const colors = getThemeColors(resolvedTheme)
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Back',
        headerTintColor: colors.text,
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ title: 'Sign in' }} />
      <Stack.Screen name="register" options={{ title: 'Create account' }} />
      <Stack.Screen name="forgot-password" options={{ title: 'Forgot password' }} />
      <Stack.Screen name="auth-callback" options={{ title: 'Sign in', headerShown: false }} />
      <Stack.Screen name="set-new-password" options={{ title: 'Set new password' }} />
      <Stack.Screen name="groups" options={{ title: 'Meal groups' }} />
      <Stack.Screen name="group/[id]" options={{ title: 'Group' }} />
      <Stack.Screen name="session/[id]" options={{ title: 'Vote' }} />
      <Stack.Screen name="results/[id]" options={{ title: 'Result' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Stack.Screen name="join-group" options={{ title: 'Join or create group' }} />
      <Stack.Screen name="add-friend" options={{ title: 'Add friend' }} />
      <Stack.Screen name="share-to-vote" options={{ title: 'Share for votes' }} />
      <Stack.Screen name="friends/index" options={{ headerShown: false }} />
      <Stack.Screen name="friends/list" options={{ title: 'Friends' }} />
      <Stack.Screen name="friends/categories" options={{ title: 'Friend categories' }} />
      <Stack.Screen name="friends/create-group" options={{ title: 'New group from friends' }} />
      <Stack.Screen name="friends/profile/[id]" options={{ title: 'Friend' }} />
    </Stack>
  )
}
