import { Stack } from 'expo-router'

export default function SettingsLayout () {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="clock-format" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="helpful-hints" />
      <Stack.Screen name="dont-want-today" />
      <Stack.Screen name="preference-ingredient-list" />
      <Stack.Screen name="edit-profile" />
      <Stack.Screen name="account" />
      <Stack.Screen name="change-email" />
      <Stack.Screen name="change-password" />
      <Stack.Screen name="two-factor" />
      <Stack.Screen name="help" />
      <Stack.Screen name="faq" />
      <Stack.Screen name="report" />
      <Stack.Screen name="feature-request" />
      <Stack.Screen name="terms" />
      <Stack.Screen name="privacy-policy" />
    </Stack>
  )
}
