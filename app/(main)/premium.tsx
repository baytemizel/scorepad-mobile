import React, { useCallback, useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import RevenueCatUI from 'react-native-purchases-ui';
import { useAuthStore } from '@/store/authStore';
import { ENTITLEMENT_ID } from '@/services/purchases';
import { logEvent } from '@/services/analytics';

/**
 * Premium ekranı: RevenueCat dashboard'unda (app.revenuecat.com → Paywalls)
 * tasarlanan paywall'ı native `RevenueCatUI.Paywall` ile gösterir. UI tamamen
 * RevenueCat'ten gelir — "current" offering'e attach edilmiş paywall otomatik
 * yüklenir, satın alma / geri yükleme akışını RevenueCat yönetir.
 *
 * Premium durumu ayrıca `purchases.ts`'teki customerInfo listener'ı üzerinden
 * `isPremium`'a yansır; burada sadece analytics loglar ve ekranı kapatırız.
 */
export default function PremiumScreen() {
  const isPremium = useAuthStore((s) => s.isPremium);

  // Paywall'ı kapatıp önceki ekrana dön. Sign-in/up'tan router.replace ile
  // açıldığında back stack olmayabilir — o durumda (main)'e düş.
  const close = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(main)');
    }
  }, []);

  // Zaten premium olan kullanıcı (örn. deep link) için paywall gösterme.
  useEffect(() => {
    if (isPremium) close();
  }, [isPremium, close]);

  if (isPremium) return null;

  return (
    <View style={{ flex: 1 }}>
      <RevenueCatUI.Paywall
        style={{ flex: 1 }}
        onPurchaseCompleted={({ storeTransaction }) => {
          void logEvent('premium_purchased', {
            product: storeTransaction.productIdentifier,
          });
          close();
        }}
        onRestoreCompleted={({ customerInfo }) => {
          if (customerInfo.entitlements.active[ENTITLEMENT_ID]) close();
        }}
        onPurchaseError={({ error }) => {
          // Satın alma hatasının detayını DEV logcat'e bas — Play Console / test
          // ortamı sorunlarını teşhis etmek için (kod, mesaj, alttaki store hatası).
          if (__DEV__) {
            console.warn(
              '[RevenueCat] paywall purchase error',
              error.code,
              error.message,
              error.underlyingErrorMessage,
            );
          }
        }}
        onDismiss={close}
      />
    </View>
  );
}
