import { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { light, dark, type Palette } from '@vspace/tokens';
import type { ThemePreference } from '@vspace/core';

/**
 * Resolves the same three-way preference the web app offers
 * (light / dark / system) to one concrete `Palette` object.
 *
 * Web does this with CSS custom properties and a `data-theme` attribute
 * (`apps/web/src/lib/theme.ts`) because the browser can restyle the whole
 * document from one attribute change. React Native has no CSS cascade —
 * every component reads colors from props/context directly — so the
 * equivalent here is a plain context providing the resolved `Palette`
 * object, and components read `useThemeColors()` instead of a `bg-*`
 * className.
 */
const ThemeContext = createContext<Palette>(light);

export function ThemeProvider({
  preference,
  children,
}: {
  preference: ThemePreference;
  children: React.ReactNode;
}) {
  const systemScheme = useColorScheme();

  const palette = useMemo(() => {
    const resolved = preference === 'system' ? (systemScheme ?? 'light') : preference;
    return resolved === 'dark' ? dark : light;
  }, [preference, systemScheme]);

  return <ThemeContext.Provider value={palette}>{children}</ThemeContext.Provider>;
}

export function useThemeColors(): Palette {
  return useContext(ThemeContext);
}
