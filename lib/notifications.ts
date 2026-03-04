import Constants from 'expo-constants'

/** In Expo Go (SDK 53+), expo-notifications is unsupported. We avoid loading it at all via dynamic import only when needed. */
const isExpoGo = Constants.appOwnership === 'expo' || Constants.appOwnership === 'expo-go'

let nativeModule: typeof import('./notifications-native') | null = null

async function getNative (): Promise<typeof import('./notifications-native') | null> {
  if (isExpoGo) return null
  if (nativeModule != null) return nativeModule
  try {
    nativeModule = await import('./notifications-native')
    return nativeModule
  } catch (_) {
    return null
  }
}

export async function requestNotificationPermissions (): Promise<boolean> {
  const mod = await getNative()
  if (mod == null) return false
  return mod.getPermissions()
}

/** Schedule a one-off reminder; returns notification id for cancellation. In Expo Go returns null. */
export async function scheduleMealReminder (
  eventId: string,
  title: string,
  triggerAt: Date
): Promise<string | null> {
  const mod = await getNative()
  if (mod == null) return null
  return mod.scheduleNotification(eventId, title, triggerAt)
}

export async function cancelScheduledNotification (notificationId: string): Promise<void> {
  const mod = await getNative()
  if (mod == null) return
  await mod.cancelNotification(notificationId)
}

/** Sync check not possible with lazy load; returns true if we're not in Expo Go (native may still fail to load). */
export function isNotificationsSupported (): boolean {
  return !isExpoGo
}
