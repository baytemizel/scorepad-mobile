import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSettingsStore } from '@/store/settingsStore';
import { useAuthStore } from '@/store/authStore';
import { fontFamilies } from '@/theme/fonts';

/**
 * Initial route. Decides where to send the user based on persisted state.
 *  - first launch  -> onboarding
 *  - returning     -> main tabs
 *
 * We render a brand splash for one frame before redirecting so the transition
 * doesn't flash a white screen.
 */
export default function Index() {
  const onboardingDone = useSettingsStore((s) => s.onboardingCompleted);
  const user = useAuthStore((s) => s.user);
  const isGuest = useAuthStore((s) => s.isGuest);

  // Show a tiny brand splash for one render then redirect.
  useEffect(() => {
    // no-op: redirect happens below
  }, []);

  if (!onboardingDone) {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  // Sign-in is optional: a signed-in user OR a guest goes straight to (main).
  // Only send to auth when neither applies (e.g. after sign-out).
  if (!user && !isGuest) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return <Redirect href="/(main)" />;
}

// Branded splash kept for testing / lazy-load fallback
export function BrandSplash() {
  return (
    <LinearGradient colors={['#0B1220', '#1D4ED8']} style={{ flex: 1 }}>
      <Animated.View
        entering={FadeIn.duration(600)}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
      >
        <View
          style={{
            width: 120,
            height: 120,
            borderRadius: 28,
            backgroundColor: '#FFFFFF22',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
          }}
        >
          <Text style={{ fontSize: 56 }}>🏆</Text>
        </View>
        <Text style={{ fontSize: 36, color: '#fff', fontFamily: fontFamilies.logo }}>
          ScorePad
        </Text>
      </Animated.View>
    </LinearGradient>
  );
}
