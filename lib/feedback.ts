import { Platform } from 'react-native'
import Constants from 'expo-constants'
import { supabase } from '@/lib/supabase'

export type FeedbackType = 'bug' | 'feature'

function getDeviceInfo (): Record<string, unknown> {
  const info: Record<string, unknown> = {
    platform: Platform.OS,
    version: Platform.Version
  }
  if (Platform.OS === 'ios' && 'isPad' in Platform) {
    info.isIPad = (Platform as { isPad?: boolean }).isPad ?? false
  }
  return info
}

function getAppVersion (): string {
  return Constants.expoConfig?.version ?? Constants.manifest?.version ?? '1.0.0'
}

/**
 * Submit a bug report or feature request to Supabase.
 * Data appears in Supabase Dashboard → Table Editor → feedback.
 */
export async function submitFeedback (
  type: FeedbackType,
  content: { description: string; [key: string]: unknown }
): Promise<{ error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('feedback')
      .insert({
        feedback_type: type,
        user_id: user?.id ?? null,
        app_version: getAppVersion(),
        device_info: getDeviceInfo(),
        content: { ...content, submittedAt: new Date().toISOString() },
        status: 'new'
      })

    if (error) return { error }
    return { error: null }
  } catch (err) {
    return { error: err instanceof Error ? err : new Error(String(err)) }
  }
}

export async function reportBug (description: string): Promise<{ error: Error | null }> {
  return submitFeedback('bug', { description: description.trim() })
}

export async function submitFeatureRequest (description: string): Promise<{ error: Error | null }> {
  return submitFeedback('feature', { description: description.trim() })
}
