import { useCallback, useEffect, useRef } from 'react';
import { useWindowDimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';

const SETTLE_MS = 450;

export interface ScoreOrientation {
  /** True when the screen is currently wider than tall. */
  isLandscape: boolean;
  /** Flip portrait <-> landscape, then hand control back to the sensor. */
  rotate: () => void;
}

/**
 * Orientation control for the match score screen — the ONLY screen allowed to
 * leave the app-wide portrait baseline (`app.config.ts` orientation: 'portrait').
 *
 * On focus it permits BOTH orientations (sensor-driven). Because the app starts
 * portrait, the screen opens portrait and follows the device from there. On blur
 * it forces portrait back so the rest of the app stays upright.
 *
 * `isLandscape` is derived from window dimensions (not the lock call), so the
 * layout re-renders correctly whether rotation came from the sensor or `rotate()`.
 */
export function useScoreOrientation(): ScoreOrientation {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const busyRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useFocusEffect(
    useCallback(() => {
      void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.ALL);
      return () => {
        void ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.PORTRAIT_UP,
        );
      };
    }, []),
  );

  // Clear any pending re-unlock on unmount.
  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  const rotate = useCallback(() => {
    // Debounce: ignore taps until the previous flip settles.
    if (busyRef.current) return;
    busyRef.current = true;

    const target = isLandscape
      ? ScreenOrientation.OrientationLock.PORTRAIT_UP
      : ScreenOrientation.OrientationLock.LANDSCAPE;

    // Force the flip even when the user isn't physically rotating (and override
    // a system rotation lock, which app-level locks supersede).
    void ScreenOrientation.lockAsync(target);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      // Re-permit sensor rotation so physical rotation still works after a
      // manual flip. Use ALL (not unlockAsync, which would snap back to the
      // app's portrait default and undo a manual landscape flip).
      void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.ALL);
      busyRef.current = false;
    }, SETTLE_MS);
  }, [isLandscape]);

  return { isLandscape, rotate };
}

export default useScoreOrientation;
