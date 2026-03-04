/**
 * Native notification implementation. Loaded only when not in Expo Go (via dynamic import from notifications.ts).
 * Kept in a separate file so the main notifications module has no static dependency on expo-notifications,
 * avoiding Metro "Got unexpected undefined" and Expo Go crashes.
 */
import * as Notifications from 'expo-notifications'

Notifications.setNotificationHandler({
  handleNotification: async () =>
    ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true
    }) as import('expo-notifications').NotificationBehavior
})

export async function getPermissions (): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync()
  if (existing === 'granted') return true
  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

export async function scheduleNotification (
  eventId: string,
  title: string,
  triggerAt: Date
): Promise<string | null> {
  const granted = await getPermissions()
  if (!granted) return null
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Meal reminder',
      body: title,
      data: { eventId }
    },
    trigger: { type: 'date', date: triggerAt } as import('expo-notifications').NotificationTriggerInput
  })
  return id
}

export async function cancelNotification (notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId)
}
