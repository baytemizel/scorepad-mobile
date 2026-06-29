import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storageAdapter } from '@/services/storage';

export type ThemePreference = 'light' | 'dark' | 'system';

export interface SettingsState {
  language: string | null; // null = follow system
  theme: ThemePreference;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  onboardingCompleted: boolean;
  hasGrantedTrackingTransparency: boolean;
  /** True once the user has seen the one-time "rotate to landscape" hint. */
  scoreRotateHintSeen: boolean;
  setLanguage: (lng: string | null) => void;
  setTheme: (t: ThemePreference) => void;
  setSoundEnabled: (v: boolean) => void;
  setHapticsEnabled: (v: boolean) => void;
  setOnboardingCompleted: (v: boolean) => void;
  setTrackingTransparencyGranted: (v: boolean) => void;
  setScoreRotateHintSeen: (v: boolean) => void;
  hydrate: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: null,
      theme: 'system',
      soundEnabled: true,
      hapticsEnabled: true,
      onboardingCompleted: false,
      hasGrantedTrackingTransparency: false,
      scoreRotateHintSeen: false,
      setLanguage: (language) => set({ language }),
      setTheme: (theme) => set({ theme }),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
      setOnboardingCompleted: (onboardingCompleted) => set({ onboardingCompleted }),
      setTrackingTransparencyGranted: (hasGrantedTrackingTransparency) =>
        set({ hasGrantedTrackingTransparency }),
      setScoreRotateHintSeen: (scoreRotateHintSeen) => set({ scoreRotateHintSeen }),
      hydrate: () => {
        // no-op: persist middleware hydrates automatically on first read.
      },
    }),
    {
      name: 'scorepad/settings',
      storage: createJSONStorage(() => storageAdapter),
      version: 1,
    },
  ),
);
