import type { ID, IsoDate, Item } from '../types/index.ts';

/**
 * On-device reminder scheduling.
 *
 * No push infrastructure, no server-side cron, no Cloud Functions — a
 * notification is scheduled locally against the OS the moment an item gets a
 * `dueAt`, and the OS fires it even if V-Space is closed. This is what the plan
 * called "no cost, works offline", and it is also simply the right tool: a
 * reminder about a Friday assignment does not need a server in the loop.
 *
 * The trade-off is real and worth stating: a notification scheduled on one
 * device does not follow you to another, and if the app is uninstalled the
 * schedule goes with it. For a single-user personal archive that is the
 * correct trade against running a always-on push backend for the same result.
 *
 * `web` and `expo-notifications` schedule fundamentally differently — the
 * browser Notification API has no reliable delayed-fire primitive at all,
 * while Expo can schedule a real OS-level trigger — so the primitive is
 * injected per platform and this file owns only the policy: which items get a
 * notification, how far ahead, and how the text reads.
 */

export interface ScheduledNotification {
  /** Stable per-item id, so re-scheduling an edited item cancels the old one. */
  id: string;
  title: string;
  body: string;
  /** When the OS should fire it. */
  fireAt: IsoDate;
}

export interface NotificationProvider {
  schedule(notification: ScheduledNotification): Promise<void>;
  cancel(id: string): Promise<void>;
  /** True once the user has granted OS-level notification permission. */
  hasPermission(): Promise<boolean>;
  requestPermission(): Promise<boolean>;
}

let provider: NotificationProvider | null = null;

export function configureNotifications(impl: NotificationProvider): void {
  provider = impl;
}

function required(): NotificationProvider {
  if (!provider) {
    throw new Error('Notifications are not configured. Call configureNotifications() at startup.');
  }
  return provider;
}

/** One notification id per item — reusable across schedule/cancel so an edit
 *  can find and replace what it previously scheduled. */
export const notificationId = (itemId: ID): string => `vspace-reminder-${itemId}`;

/**
 * Schedules (or re-schedules) the reminder for one item, honouring the user's
 * lead time. A `dueAt` already in the past is not scheduled — firing a
 * notification for a deadline that has already passed would just be confusing.
 */
export async function scheduleReminder(item: Item, leadMinutes: number): Promise<void> {
  if (!item.dueAt || item.status !== 'active') {
    await cancelReminder(item.id);
    return;
  }

  const fireAt = new Date(new Date(item.dueAt).getTime() - leadMinutes * 60_000);
  if (fireAt.getTime() <= Date.now()) {
    await cancelReminder(item.id);
    return;
  }

  await required().schedule({
    id: notificationId(item.id),
    title: reminderTitle(item, leadMinutes),
    body: item.title,
    fireAt: fireAt.toISOString(),
  });
}

export const cancelReminder = (itemId: ID): Promise<void> => required().cancel(notificationId(itemId));

export const hasNotificationPermission = (): Promise<boolean> => required().hasPermission();
export const requestNotificationPermission = (): Promise<boolean> => required().requestPermission();

/**
 * Reconciles every item's schedule against the OS in one pass — called once
 * after the item stream loads, so a fresh install, a changed lead time, or a
 * reminder added on another device all converge to the correct set of pending
 * notifications without per-item bookkeeping.
 */
export async function resyncReminders(items: readonly Item[], leadMinutes: number): Promise<void> {
  const withDueDates = items.filter((i) => i.dueAt && i.status === 'active');
  await Promise.all(withDueDates.map((item) => scheduleReminder(item, leadMinutes)));
}

function reminderTitle(item: Item, leadMinutes: number): string {
  if (leadMinutes < 60) return `Due in ${leadMinutes} min`;
  if (leadMinutes < 24 * 60) {
    const hours = Math.round(leadMinutes / 60);
    return `Due in ${hours} hour${hours === 1 ? '' : 's'}`;
  }
  const days = Math.round(leadMinutes / (24 * 60));
  return `Due in ${days} day${days === 1 ? '' : 's'}`;
}
