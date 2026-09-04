'use client';

import { Sun, Moon, MonitorSmartphone, type LucideIcon } from 'lucide-react';
import { updateSettings, type ThemePreference } from '@vspace/core';
import { applyTheme } from '@/lib/theme';
import { IconButton } from './Button';

/**
 * Cycles Light → Dark → System, applying the change to the document
 * immediately (`applyTheme`) and persisting it to the profile in the same
 * call — the write is fire-and-forget, exactly like every other settings
 * change in the app, because the visual result the user is judging already
 * happened locally before Firestore has even been asked.
 */
const ORDER: readonly ThemePreference[] = ['light', 'dark', 'system'];

const ICON: Record<ThemePreference, LucideIcon> = {
  light: Sun,
  dark: Moon,
  system: MonitorSmartphone,
};

const LABEL: Record<ThemePreference, string> = {
  light: 'Light theme',
  dark: 'Dark theme',
  system: 'Match system',
};

export function ThemeToggle({ uid, current }: { uid: string; current: ThemePreference }) {
  const Icon = ICON[current];
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length]!;

  function cycle() {
    applyTheme(next);
    void updateSettings(uid, { theme: next });
  }

  return (
    <IconButton label={`${LABEL[current]} — tap for ${LABEL[next].toLowerCase()}`} size="sm" onClick={cycle}>
      <Icon className="size-4" />
    </IconButton>
  );
}
