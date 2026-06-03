import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { useSettingsStore } from '@/store/settingsStore';

export type HapticKind = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

export function haptic(kind: HapticKind = 'light'): void {
  if (!useSettingsStore.getState().hapticsEnabled) return;
  try {
    switch (kind) {
      case 'light':
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'success':
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'error':
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
    }
  } catch {
    // hardware doesn't support, ignore
  }
}

let scoreSound: Audio.Sound | null = null;
let whistleSound: Audio.Sound | null = null;

export async function preloadSounds(): Promise<void> {
  if (!useSettingsStore.getState().soundEnabled) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: false,
      shouldDuckAndroid: true,
    });
    // Sounds are optional. If files are missing we silently fall back.
    try {
      const { sound: a } = await Audio.Sound.createAsync(
        require('../../assets/sounds/score.wav'),
        { shouldPlay: false, volume: 0.4 },
      );
      scoreSound = a;
    } catch {
      scoreSound = null;
    }
    try {
      const { sound: b } = await Audio.Sound.createAsync(
        require('../../assets/sounds/whistle.wav'),
        { shouldPlay: false, volume: 0.5 },
      );
      whistleSound = b;
    } catch {
      whistleSound = null;
    }
  } catch {
    // audio unavailable
  }
}

export async function playScoreSound(): Promise<void> {
  if (!useSettingsStore.getState().soundEnabled) return;
  if (!scoreSound) return;
  try {
    await scoreSound.replayAsync();
  } catch {
    // ignore
  }
}

export async function playWhistle(): Promise<void> {
  if (!useSettingsStore.getState().soundEnabled) return;
  if (!whistleSound) return;
  try {
    await whistleSound.replayAsync();
  } catch {
    // ignore
  }
}

export async function unloadSounds(): Promise<void> {
  try {
    await scoreSound?.unloadAsync();
    await whistleSound?.unloadAsync();
  } catch {
    // ignore
  }
  scoreSound = null;
  whistleSound = null;
}
