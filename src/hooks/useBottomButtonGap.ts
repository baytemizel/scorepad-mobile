import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Bottom insets at or above this come from Android's 3-button navigation bar
 * (44-48dp). The gesture handle (~16-24dp) and the iOS home indicator (34dp on
 * iPhone, 20dp on iPad) stay below it.
 */
const BUTTON_NAV_BAR_MIN = 40;

/**
 * Space to leave under a screen's bottom-most buttons, on top of the bottom
 * safe-area inset.
 *
 * Only a thin gesture handle or the iOS home indicator — a bottom inset between
 * 0 and 40dp, which the inset already clears — keeps the tight 8pt. Everything
 * else gets 20pt, because the buttons would otherwise sit right on a solid bar
 * or the screen edge:
 *  - Android's 3-button bar drawn over the app (inset 44-48dp);
 *  - the same bar on devices that lay the app out *above* it instead, where the
 *    inset is 0 because nothing overlaps (ColorOS on Android 12 does this — the
 *    root view stops at the bar);
 *  - no bar at all (inset 0): a home-button iPhone, a hidden Android bar.
 */
export function useBottomButtonGap(): number {
  const { bottom } = useSafeAreaInsets();
  return bottom > 0 && bottom < BUTTON_NAV_BAR_MIN ? 8 : 20;
}

export default useBottomButtonGap;
