import { LogBox, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useThemeColors, useTheme } from '@/hooks/useTheme'
import { useFrameworkReady } from '@/hooks/useFrameworkReady'
import AuthRedirect from '@/components/AuthRedirect'
import { ThemeProvider } from '@/contexts/ThemeContext'

// Reduce console/UI spam when device cannot reach Supabase (e.g. wrong URL or no network)
LogBox.ignoreLogs(['Network request failed', 'AuthRetryableFetchError'])

function RootStack () {
  const insets = useSafeAreaInsets()
  const { resolvedTheme } = useTheme()
  const colors = useThemeColors()
  const statusBarStyle = resolvedTheme === 'dark' ? 'light' : 'dark'
  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: colors.background }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="privacy" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="game/feeling" />
        <Stack.Screen name="game/spin" />
        <Stack.Screen name="game/spin-styles" />
        <Stack.Screen name="game/round/[index]" />
        <Stack.Screen name="game/results" />
        <Stack.Screen name="preferences" />
        <Stack.Screen name="food-gallery" />
        <Stack.Screen name="recipe/[id]" />
        <Stack.Screen name="social" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={statusBarStyle} />
    </View>
  )
}

export default function RootLayout () {
  useFrameworkReady()

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthRedirect />
      <SafeAreaProvider>
        <ThemeProvider>
          <RootStack />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
