import React from 'react';
import { View } from 'react-native';
import { BannerAd, BannerAdSize, adUnitIds } from '@/services/ads';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';

/**
 * Renders a banner ad. Hidden when the user is premium.
 * Used on Home, Setup, and the post-match screen — never on the live scoring screen.
 */
export function AdBanner() {
  const isPremium = useAuthStore((s) => s.isPremium);
  const trackingGranted = useSettingsStore((s) => s.hasGrantedTrackingTransparency);
  if (isPremium) return null;

  return (
    <View style={{ alignItems: 'center', paddingVertical: 4 }}>
      <BannerAd
        unitId={adUnitIds.banner}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: !trackingGranted,
        }}
      />
    </View>
  );
}

export default AdBanner;
