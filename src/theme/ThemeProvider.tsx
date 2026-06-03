import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useSettingsStore } from '@/store/settingsStore';
import { buildTheme, Theme, ThemeMode } from './tokens';

interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode | 'system') => void;
  preference: ThemeMode | 'system';
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const themePreference = useSettingsStore((s) => s.theme);
  const setThemePreference = useSettingsStore((s) => s.setTheme);

  const resolvedMode: ThemeMode = useMemo(() => {
    if (themePreference === 'system') {
      return systemScheme === 'light' ? 'light' : 'dark';
    }
    return themePreference;
  }, [themePreference, systemScheme]);

  const theme = useMemo(() => buildTheme(resolvedMode), [resolvedMode]);

  // Hydrate persisted theme on mount
  useEffect(() => {
    useSettingsStore.getState().hydrate();
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      mode: resolvedMode,
      preference: themePreference,
      setMode: setThemePreference,
    }),
    [theme, resolvedMode, themePreference, setThemePreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Fallback to dark theme if used outside provider (e.g. error screens before mount)
    return buildTheme('dark');
  }
  return ctx.theme;
}

export function useThemeControls() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useThemeControls must be used inside <ThemeProvider>');
  }
  return ctx;
}
