import { useCallback, useEffect, useRef } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';

const SETTLE_MS = 450;

/**
 * "Follow the device" lock.
 *
 * iOS must NOT use `OrientationLock.ALL`: that mask includes upside-down
 * portrait, which no notched iPhone supports, so expo-screen-orientation
 * rejects the call outright (`UnsupportedOrientationLockException`) and the
 * screen silently stays on whatever lock was already in force — the app-wide
 * PORTRAIT_UP from `app/_layout.tsx`. That is why rotating the device did
 * nothing on iPhone while Android rotated fine. `DEFAULT` is "every
 * orientation this device supports" and is always accepted.
 *
 * Android keeps ALL (`SCREEN_ORIENTATION_FULL_SENSOR`), which rotates from the
 * sensor even when the user has auto-rotate switched off — the useful
 * behaviour for a scoreboard propped up on a bench.
 */
const FOLLOW_DEVICE =
  Platform.OS === 'ios'
    ? ScreenOrientation.OrientationLock.DEFAULT
    : ScreenOrientation.OrientationLock.ALL;

/** Fire-and-forget lock: a rejected lock must never surface as an unhandled rejection. */
function lock(orientation: ScreenOrientation.OrientationLock) {
  ScreenOrientation.lockAsync(orientation).catch(() => undefined);
}

export interface ScoreOrientation {
  /** True when the screen is currently wider than tall. */
  isLandscape: boolean;
  /** Flip portrait <-> landscape and hold that orientation. */
  rotate: () => void;
}

/**
 * Orientation control for the match score screen — the ONLY screen allowed to
 * leave the app-wide portrait baseline (`app.config.ts` orientation: 'portrait').
 *
 * On focus it permits every orientation the device supports, so the screen
 * opens portrait and then follows the device. On blur it forces portrait back
 * so the rest of the app stays upright.
 *
 * `rotate()` is the manual override for a phone whose system rotation lock is
 * on, and it *holds*: it pins the flipped orientation until the user taps again
 * (or leaves the screen and comes back). Handing control back to the sensor a
 * moment later would undo the flip instantly — both platforms re-read the
 * physical device orientation the moment the mask widens again, and the phone
 * is of course still lying the way it was.
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
      lock(FOLLOW_DEVICE);
      return () => {
        lock(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      };
    }, []),
  );

  // Clear any pending debounce reset on unmount.
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

    lock(
      isLandscape
        ? ScreenOrientation.OrientationLock.PORTRAIT_UP
        : ScreenOrientation.OrientationLock.LANDSCAPE,
    );

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      busyRef.current = false;
    }, SETTLE_MS);
  }, [isLandscape]);

  return { isLandscape, rotate };
}

export default useScoreOrientation;
