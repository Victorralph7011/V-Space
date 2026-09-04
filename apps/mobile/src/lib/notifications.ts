import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { configureNotifications, type NotificationProvider } from '@vspace/core';

/**
 * Mobile implementation of on-device reminder scheduling — the counterpart to
 * apps/web/src/lib/notifications.ts. Unlike the web version (a plain
 * `setTimeout`, since the browser has no reliable closed-tab scheduling
 * without a service worker), `expo-notifications` schedules a real OS-level
 * trigger: it fires whether or not V-Space is running, which is what makes
 * mobile reminders actually reliable — this is the one place mobile is
 * strictly better than web, not just different.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const expoNotificationProvider: NotificationProvider = {
  async schedule({ id, title, body, fireAt }) {
    // Re-scheduling under the same id requires cancelling first — Expo
    // does not overwrite a pending trigger of the same identifier.
    await Notifications.cancelScheduledNotificationAsync(id);
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: { title, body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(fireAt) },
    });
  },

  async cancel(id) {
    await Notifications.cancelScheduledNotificationAsync(id);
  },

  async hasPermission() {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  },

  async requestPermission() {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  },
};

export async function initNotifications(): Promise<void> {
  configureNotifications(expoNotificationProvider);

  // Android requires an explicit channel or scheduled notifications are
  // silently dropped on API 26+ — harmless no-op on iOS.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}
