import { Platform } from 'react-native';
import mobileAds, {
  BannerAd,
  BannerAdSize,
  InterstitialAd,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';
import * as TrackingTransparency from 'expo-tracking-transparency';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import Constants from 'expo-constants';

const env = Constants.expoConfig?.extra ?? {};

const isDev = __DEV__;

export const adUnitIds = {
  banner: isDev
    ? TestIds.BANNER
    : Platform.select({
        ios: process.env.ADMOB_BANNER_IOS ?? TestIds.BANNER,
        android: process.env.ADMOB_BANNER_ANDROID ?? TestIds.BANNER,
        default: TestIds.BANNER,
      })!,
  interstitial: isDev
    ? TestIds.INTERSTITIAL
    : Platform.select({
        ios: process.env.ADMOB_INTERSTITIAL_IOS ?? TestIds.INTERSTITIAL,
        android: process.env.ADMOB_INTERSTITIAL_ANDROID ?? TestIds.INTERSTITIAL,
        default: TestIds.INTERSTITIAL,
      })!,
};

let initialized = false;

export async function initializeAds(): Promise<void> {
  if (initialized) return;

  // Request ATT before initializing on iOS for proper personalization opt-in.
  if (Platform.OS === 'ios') {
    try {
      const { granted } = await TrackingTransparency.getTrackingPermissionsAsync();
      if (!granted) {
        const result = await TrackingTransparency.requestTrackingPermissionsAsync();
        useSettingsStore.getState().setTrackingTransparencyGranted(result.granted);
      } else {
        useSettingsStore.getState().setTrackingTransparencyGranted(true);
      }
    } catch {
      // ATT not available (simulator etc.) - continue.
    }
  }

  await mobileAds().initialize();
  initialized = true;
}

export function shouldShowAds(): boolean {
  return !useAuthStore.getState().isPremium;
}

class InterstitialController {
  private ad: InterstitialAd | null = null;
  private loading = false;

  load(): void {
    if (this.loading || this.ad?.loaded) return;
    this.loading = true;
    this.ad = InterstitialAd.createForAdRequest(adUnitIds.interstitial, {
      requestNonPersonalizedAdsOnly:
        !useSettingsStore.getState().hasGrantedTrackingTransparency,
    });
    const unsubLoaded = this.ad.addAdEventListener(AdEventType.LOADED, () => {
      this.loading = false;
    });
    const unsubError = this.ad.addAdEventListener(AdEventType.ERROR, () => {
      this.loading = false;
      unsubLoaded();
      unsubError();
    });
    const unsubClosed = this.ad.addAdEventListener(AdEventType.CLOSED, () => {
      // Auto-load the next one for snappy follow-ups.
      unsubClosed();
      this.ad = null;
      this.load();
    });
    this.ad.load();
  }

  show(): boolean {
    if (!shouldShowAds()) return false;
    if (this.ad?.loaded) {
      this.ad.show();
      return true;
    }
    this.load();
    return false;
  }
}

export const interstitial = new InterstitialController();

export { BannerAd, BannerAdSize };
