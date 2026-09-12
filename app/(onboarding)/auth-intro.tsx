import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Pressable,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { GoogleSignInButton } from '@/components/common/GoogleSignInButton';
import { AppleSignInButton } from '@/components/common/AppleSignInButton';
import { useSettingsStore } from '@/store/settingsStore';
import { useAuthStore } from '@/store/authStore';
import {
  signInWithApple,
  signInWithGoogle,
  socialSignInErrorKey,
} from '@/services/auth';
import { logEvent } from '@/services/analytics';
import { UserProfile } from '@/types';

const sportsBg = require('../../assets/images/sports-bg.jpg');

type SocialProvider = 'google' | 'apple';

export default function AuthIntro() {
  const { t } = useTranslation();
  const setOnboardingCompleted = useSettingsStore((s) => s.setOnboardingCompleted);
  const continueAsGuest = useAuthStore((s) => s.continueAsGuest);
  // The provider sign-in in flight: both buttons are disabled meanwhile, only
  // the pressed one spins.
  const [busy, setBusy] = useState<SocialProvider | null>(null);

  const goAfterAuth = (profile: UserProfile) => {
    router.replace(profile.isPremium ? '/(main)' : '/(main)/premium');
  };

  const onCreateAccount = () => {
    setOnboardingCompleted(true);
    void logEvent('onboarding_complete', { mode: 'sign_up' });
    router.replace('/(auth)/sign-up');
  };

  const onLogIn = () => {
    setOnboardingCompleted(true);
    void logEvent('onboarding_complete', { mode: 'sign_in' });
    router.replace('/(auth)/sign-in');
  };

  const runSocialSignIn = async (
    provider: SocialProvider,
    signIn: () => Promise<UserProfile>,
  ) => {
    try {
      setBusy(provider);
      const profile = await signIn();
      setOnboardingCompleted(true);
      void logEvent('onboarding_complete', { mode: provider });
      goAfterAuth(profile);
    } catch (e) {
      const errorKey = socialSignInErrorKey(e);
      if (!errorKey) return; // the user closed the provider's sheet
      console.error(`[SignIn:${provider}] error:`, e);
      Alert.alert(t(errorKey));
    } finally {
      setBusy(null);
    }
  };

  const onGuest = () => {
    continueAsGuest();
    setOnboardingCompleted(true);
    void logEvent('onboarding_complete', { mode: 'guest' });
    router.replace('/(main)');
  };

  return (
    <ImageBackground source={sportsBg} style={styles.bg} resizeMode="cover">
      {/* Darkening overlay — light at the top so the artwork shows through,
          deeper at the bottom to keep the controls legible. */}
      <LinearGradient
        colors={['rgba(11,18,32,0.15)', 'rgba(11,18,32,0.88)']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.spacer} />

        <View style={styles.footer}>
          <Button
            label={t('onboarding.auth.createAccount')}
            variant="primary"
            size="lg"
            fullWidth
            onPress={onCreateAccount}
          />

          <Pressable onPress={onLogIn} hitSlop={8} style={styles.logInRow}>
            <Text style={styles.logInText}>
              {t('onboarding.auth.alreadyHaveAccount')}{' '}
              <Text style={styles.logInLink}>{t('onboarding.auth.logIn')}</Text>
            </Text>
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('common.or')}</Text>
            <View style={styles.dividerLine} />
          </View>

          <GoogleSignInButton
            label={t('auth.signInGoogle')}
            loading={busy === 'google'}
            disabled={busy !== null}
            fullWidth
            onPress={() => void runSocialSignIn('google', signInWithGoogle)}
          />

          <AppleSignInButton
            loading={busy === 'apple'}
            disabled={busy !== null}
            onPress={() => void runSocialSignIn('apple', signInWithApple)}
          />

          <Pressable onPress={onGuest} hitSlop={8} style={styles.guestRow}>
            <Text style={styles.guestText}>{t('onboarding.auth.useGuest')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1 },
  spacer: { flex: 1 },
  footer: { padding: 24, gap: 14 },
  logInRow: { alignItems: 'center', paddingVertical: 2 },
  guestRow: { alignItems: 'center', paddingVertical: 8 },
  guestText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 15,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  logInText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    textAlign: 'center',
  },
  logInLink: {
    color: '#FFFFFF',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 2,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.22)' },
  dividerText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
