/**
 * Expo config: base config lives here; .env supplies Supabase URL/key via extra.
 * See https://docs.expo.dev/workflow/configuration/
 */
const path = require('path')

try {
  require('dotenv').config({ path: path.resolve(__dirname, '.env') })
} catch {
  // dotenv optional; Expo CLI also loads EXPO_PUBLIC_* from .env
}

const baseExpo = {
  name: 'Meal of Fortune',
  slug: 'bolt-expo-nativewind',
  version: '1.0.2',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'myapp',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  updates: {
    enabled: false,
    checkAutomatically: 'NEVER'
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.trippintreeko.mealoffortune'
  },
  android: {
    package: 'com.trippintreeko.mealoffortune',
    versionCode: 3
  },
  web: {
    bundler: 'metro',
    output: 'single',
    favicon: './assets/images/favicon.png'
  },
  plugins: [
    '@react-native-community/datetimepicker',
    'expo-router',
    'expo-font',
    'expo-web-browser',
    [
      'expo-notifications',
      {
        icon: './assets/images/icon.png',
        color: '#22c55e',
        sounds: []
      }
    ]
  ],
  experiments: {
    typedRoutes: true
  },
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
    eas: {
      projectId: '5c52dfe0-94f7-4e98-971f-ff3a06d7915a'
    }
  }
}

module.exports = {
  expo: baseExpo
}
