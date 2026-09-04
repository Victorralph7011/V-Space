'use client';

import { configureNotifications, type NotificationProvider } from '@vspace/core';

/**
 * Web implementation of on-device reminder scheduling.
 *
 * The browser Notification API has no reliable "fire this at a future time
 * even if the tab is closed" primitive — that is what a service worker + Push
 * API combination is for, and standing up push infrastructure is exactly the
 * server dependency the plan chose to avoid. So this schedules with a plain
 * `setTimeout` while the tab is open, which covers the realistic case for a
 * desktop-first personal tool: V-Space open in a pinned tab or the PWA window.
 *
 * The honest limitation: a reminder for tomorrow will not fire if the tab is
 * closed tonight. `resyncReminders()` (called on every app load) is the
 * mitigation — it re-schedules everything still due against `now`, so the
 * worst case is a reminder appearing "late" the next time V-Space is open
 * rather than never at all. A closed-tab-reliable version is a service-worker
 * upgrade for later, not a blocker for shipping this.
 */
const timers = new Map<string, ReturnType<typeof setTimeout>>();

/** setTimeout's delay is a 32-bit signed int (~24.8 days) before it overflows. */
const MAX_TIMEOUT_MS = 2_147_000_000;

function armTimer(id: string, fireAt: number, title: string, body: string): void {
  const delay = fireAt - Date.now();
  const clampedDelay = Math.min(Math.max(delay, 0), MAX_TIMEOUT_MS);

  const timer = setTimeout(() => {
    // A delay longer than the 32-bit cap was clamped — re-arm for the
    // remainder rather than firing early.
    if (delay > MAX_TIMEOUT_MS) {
      armTimer(id, fireAt, title, body);
      return;
    }
    timers.delete(id);
    if (Notification.permission === 'granted') {
      new Notification(title, { body, tag: id });
    }
  }, clampedDelay);

  timers.set(id, timer);
}

const webNotificationProvider: NotificationProvider = {
  async schedule({ id, title, body, fireAt }) {
    const existing = timers.get(id);
    if (existing) clearTimeout(existing);
    armTimer(id, new Date(fireAt).getTime(), title, body);
  },

  async cancel(id) {
    const existing = timers.get(id);
    if (existing) {
      clearTimeout(existing);
      timers.delete(id);
    }
  },

  async hasPermission() {
    return typeof Notification !== 'undefined' && Notification.permission === 'granted';
  },

  async requestPermission() {
    if (typeof Notification === 'undefined') return false;
    const result = await Notification.requestPermission();
    return result === 'granted';
  },
};

export function initNotifications(): void {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return;
  configureNotifications(webNotificationProvider);
}
