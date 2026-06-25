import React, { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { I18nextProvider } from 'react-i18next';
import { View } from 'react-native';
import Constants from 'expo-constants';

import i18n, { applyRtl } from '@/localization/i18n';
import { fontAssets, installGlobalFont } from '@/theme/fonts';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { useSettingsStore } from '@/store/settingsStore';
import { useAuthStore } from '@/store/authStore';
import { initializeAds } from '@/services/ads';
import { initializePurchases, identifyPurchaseUser } from '@/services/purchases';
import { preloadSounds } from '@/services/feedback';
import {
  subscribeToAuthChanges,
  configureFacebookSignIn,
  configureGoogleSignIn,
} from '@/services/auth';

void SplashScreen.preventAutoHideAsync();

// Make Poppins the app-wide default before the first render.
installGlobalFont();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000,
    },
  },
});

export default function RootLayout() {
  const [bootReady, setBootReady] = useState(false);
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fontsReady = fontsLoaded || fontError != null;
  const language = useSettingsStore((s) => s.language);

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      try {
        if (language && i18n.language !== language) {
          await i18n.changeLanguage(language);
        }
        applyRtl(i18n.language);

        configureFacebookSignIn(
          process.env.FACEBOOK_APP_ID,
          process.env.FACEBOOK_CLIENT_TOKEN,
        );

        configureGoogleSignIn(
          Constants.expoConfig?.extra?.firebaseGoogleWebClientId,
        );

        await Promise.allSettled([
          initializeAds(),
          initializePurchases(),
          preloadSounds(),
        ]);
      } catch {
        // continue regardless; the app should still launch
      } finally {
        if (!cancelled) {
          setBootReady(true);
        }
      }
    };
    void boot();
    return () => {
      cancelled = true;
    };
  }, [language]);

  // Reveal the app only once initialization is done and fonts are ready, so the
  // first frame already renders in Poppins / Jaro.
  useEffect(() => {
    if (bootReady && fontsReady) {
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [bootReady, fontsReady]);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((fbUser) => {
      const current = useAuthStore.getState().user;
      if (fbUser) {
        // A restored/active Firebase session: alias RevenueCat to this uid so
        // purchases are attributed to (and premium read from) the real account,
        // not a leftover anonymous id. `identifyPurchaseUser` is only otherwise
        // called on interactive sign-in, so restored sessions would miss it.
        void identifyPurchaseUser(fbUser.uid);
        return;
      }
      // Firebase reports signed-out — clear the store and bounce back to auth.
      if (current) {
        useAuthStore.getState().signOut();
        router.replace('/(auth)/sign-in');
      }
    });
    return unsubscribe;
  }, []);

  if (!bootReady || !fontsReady) {
    return <View style={{ flex: 1, backgroundColor: '#0B1220' }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <I18nextProvider i18n={i18n}>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <StatusBar style="auto" />
              <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(onboarding)" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(main)" />
                <Stack.Screen
                  name="match/score"
                  options={{ animation: 'fade', gestureEnabled: false }}
                />
              </Stack>
            </ThemeProvider>
          </QueryClientProvider>
        </I18nextProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
