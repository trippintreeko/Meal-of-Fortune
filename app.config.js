/**
 * Expo config: loads .env and exposes Supabase URL/key via extra
 * so the app can reach Supabase (Constants.expoConfig.extra).
 * Place this file in the project root (same folder as app.json).
 */
const path = require('path')

try {
  require('dotenv').config({ path: path.resolve(__dirname, '.env') })
} catch {
  // dotenv optional; Expo CLI also loads EXPO_PUBLIC_* from .env
}

const appJson = require('./app.json')

module.exports = {
  ...appJson,
  expo: {
    ...appJson.expo,
    extra: {
      ...appJson.expo?.extra,
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''
    }
  }
}
