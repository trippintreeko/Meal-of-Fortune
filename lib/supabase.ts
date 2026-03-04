import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import Constants from 'expo-constants'

const fromExtra = Constants.expoConfig?.extra
const supabaseUrl = (fromExtra?.supabaseUrl as string | undefined)?.trim() || (process.env.EXPO_PUBLIC_SUPABASE_URL as string | undefined)?.trim() || ''
const supabaseAnonKey = (fromExtra?.supabaseAnonKey as string | undefined)?.trim() || (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string | undefined)?.trim() || ''

function getSupabase () {
  const key = '__supabase_client'
  const g = typeof globalThis !== 'undefined' ? globalThis : (typeof global !== 'undefined' ? global : ({} as Record<string, unknown>))
  if ((g as Record<string, unknown>)[key]) return (g as Record<string, unknown>)[key] as ReturnType<typeof createClient>
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    }
  })
  ;(g as Record<string, unknown>)[key] = client
  return client
}

export const supabase = getSupabase()
