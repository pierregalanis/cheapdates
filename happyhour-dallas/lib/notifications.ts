import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { supabase } from './supabase';

// ─── Foreground handler ───────────────────────────────────────────────────────
// Must be called at module level (called by root _layout.tsx import)

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Android channels ─────────────────────────────────────────────────────────

async function setupAndroidChannels() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('happy-hour-alerts', {
    name: 'Happy Hour Alerts',
    description: 'Live deal alerts ending soon',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF6B1A',
    sound: 'default',
    enableVibrate: true,
  });
  await Notifications.setNotificationChannelAsync('reminders', {
    name: 'Reminders',
    description: 'Scheduled happy hour reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
  });
  await Notifications.setNotificationChannelAsync('social', {
    name: 'Friends',
    description: 'Friend check-ins and social activity',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
  });
}

// ─── Permission + token registration ─────────────────────────────────────────

export async function registerForPushNotifications(): Promise<string | null> {
  await setupAndroidChannels();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getDevicePushTokenAsync();
    return typeof tokenData.data === 'string' ? tokenData.data : null;
  } catch {
    // EAS not configured yet — native push unavailable in dev
    return null;
  }
}

// Save/update push token in Supabase profiles table
// Requires: ALTER TABLE profiles ADD COLUMN push_token text;  (see supabase/migrations/001_push_token.sql)
export async function savePushToken(userId: string, token: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ push_token: token } as any)
    .eq('id', userId);
  if (error) console.warn('[notifications] savePushToken failed:', error.message);
}

// ─── Local scheduled reminders ────────────────────────────────────────────────

export async function scheduleHappyHourReminder(opts: {
  restaurantId: string;
  restaurantName: string;
  triggerDate: Date;
}): Promise<string> {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '⏰ Happy hour starting soon!',
      body: `${opts.restaurantName} — happy hour starts in 30 minutes`,
      data: { restaurantId: opts.restaurantId, type: 'reminder' },
      sound: 'default',
      ...(Platform.OS === 'android' && { channelId: 'reminders' }),
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: opts.triggerDate },
  });
  return id;
}

export async function scheduleEndingAlert(opts: {
  restaurantId: string;
  restaurantName: string;
  minutesBefore?: number;
  happyHourEndDate: Date;
}): Promise<string> {
  const minutesBefore = opts.minutesBefore ?? 15;
  const triggerDate = new Date(opts.happyHourEndDate.getTime() - minutesBefore * 60_000);
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `🔥 ${opts.restaurantName} deal ending soon!`,
      body: `Only ${minutesBefore} minutes left on happy hour deals`,
      data: { restaurantId: opts.restaurantId, type: 'deal_ending' },
      sound: 'default',
      ...(Platform.OS === 'android' && { channelId: 'happy-hour-alerts' }),
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
  });
  return id;
}

export async function cancelNotification(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id);
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ─── Listeners (call in root _layout.tsx) ────────────────────────────────────

export function addNotificationReceivedListener(
  handler: (n: Notifications.Notification) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationReceivedListener(handler);
}

export function addNotificationResponseListener(): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as {
      restaurantId?: string;
      type?: string;
    };
    if (data?.restaurantId) {
      router.push({ pathname: '/restaurant/[id]', params: { id: data.restaurantId } } as any);
    }
  });
}

// Get current badge count
export async function getBadgeCount(): Promise<number> {
  return Notifications.getBadgeCountAsync();
}

// Clear badge + mark all as read
export async function clearBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}
