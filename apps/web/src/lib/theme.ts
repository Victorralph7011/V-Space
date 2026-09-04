'use client';

import type { ThemePreference } from '@vspace/core';

/**
 * Applies a theme preference to the document.
 *
 * `tokens.css` already defines both palettes and switches between them via
 * `prefers-color-scheme` for the `'system'` case (see
 * `scripts/gen-tokens-css.ts`). This function is what makes `'light'` and
 * `'dark'` an explicit *choice* rather than only ever following the OS: it
 * sets `data-theme` on `<html>`, and the generated CSS's
 * `:root[data-theme="dark"]` / `[data-theme="light"]` blocks — which come
 * after the `prefers-color-scheme` block in source order — win over it.
 *
 * `'system'` removes the attribute entirely rather than setting it to some
 * third value, so the media query takes back over exactly as if the user had
 * never chosen anything.
 */
export function applyTheme(preference: ThemePreference): void {
  const root = document.documentElement;
  if (preference === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', preference);
}

/**
 * Reads whatever was applied most recently — used by the toggle to decide
 * what "the opposite" means without needing the settings round-trip to have
 * finished first.
 */
export function currentAppliedTheme(): ThemePreference {
  const attr = document.documentElement.getAttribute('data-theme');
  return attr === 'light' || attr === 'dark' ? attr : 'system';
}
