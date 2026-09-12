import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  ActivityIndicator,
  ImageBackground,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GoogleSignInButton } from '@/components/common/GoogleSignInButton';
import { AppleSignInButton } from '@/components/common/AppleSignInButton';
import { haptic } from '@/services/feedback';
import { useAuthStore } from '@/store/authStore';
import {
  signInWithEmail,
  signInWithApple,
  signInWithGoogle,
  signInWithFacebook,
  socialSignInErrorKey,
} from '@/services/auth';
import { UserProfile } from '@/types';

const sportsBg = require('../../assets/images/sports-bg.jpg');
const facebookEnabled = Constants.expoConfig?.extra?.facebookEnabled === true;

type SignInMethod = 'email' | 'google' | 'apple' | 'facebook';

/**
 * After any successful sign-in/sign-up, send the user to the premium upsell
 * if they aren't premium yet; otherwise straight to the main app.
 */
function goAfterAuth(profile: UserProfile): void {
  router.replace(profile.isPremium ? '/(main)' : '/(main)/premium');
}

/** Translucent-white social button that stays legible over the dark hero. */
function SocialButton({
  label,
  onPress,
  loading,
  disabled,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={() => {
        if (isDisabled) return;
        haptic('light');
        onPress();
      }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.socialBtn,
        pressed && { backgroundColor: 'rgba(255,255,255,0.2)' },
        isDisabled && { opacity: 0.6 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={styles.socialBtnText}>{label}</Text>
      )}
    </Pressable>
  );
}

export default function SignIn() {
  const { t } = useTranslation();
  const continueAsGuest = useAuthStore((s) => s.continueAsGuest);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // The sign-in in flight: every option is disabled meanwhile, only the
  // pressed one spins.
  const [busy, setBusy] = useState<SignInMethod | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onGuest = () => {
    continueAsGuest();
    router.replace('/(main)');
  };

  const onEmailSignIn = async () => {
    setError(null);
    if (!email.includes('@')) {
      setError(t('auth.errors.invalidEmail'));
      return;
    }
    if (password.length < 6) {
      setError(t('auth.errors.weakPassword'));
      return;
    }
    setBusy('email');
    try {
      const profile = await signInWithEmail(email.trim(), password);
      goAfterAuth(profile);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      setError(/wrong-password|user-not-found|invalid/i.test(msg)
        ? t('auth.errors.wrongPassword')
        : t('auth.errors.generic'));
    } finally {
      setBusy(null);
    }
  };

  const runSocialSignIn = async (
    method: Exclude<SignInMethod, 'email'>,
    signIn: () => Promise<UserProfile>,
  ) => {
    try {
      setBusy(method);
      const profile = await signIn();
      goAfterAuth(profile);
    } catch (e) {
      const errorKey = socialSignInErrorKey(e);
      if (!errorKey) return; // the user closed the provider's sheet
      console.error(`[SignIn:${method}] error:`, e);
      if (__DEV__ && errorKey === 'auth.errors.generic') {
        const err = e as {
          code?: string | number;
          message?: string;
          userInfo?: unknown;
        };
        Alert.alert(
          `[DEV] ${method} sign-in error`,
          [
            `code: ${err.code ?? 'n/a'}`,
            `message: ${err.message ?? String(e)}`,
            err.userInfo
              ? `userInfo: ${JSON.stringify(err.userInfo).slice(0, 300)}`
              : '',
          ]
            .filter(Boolean)
            .join('\n\n'),
        );
      } else {
        Alert.alert(t(errorKey));
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <ImageBackground source={sportsBg} style={styles.bg} resizeMode="cover">
      {/* Darkening overlay — light at the top so the artwork shows through,
          deeper at the bottom to keep the form legible. */}
      <LinearGradient
        colors={['rgba(11,18,32,0.25)', 'rgba(11,18,32,0.92)']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>{t('auth.signIn')}</Text>
            <Text style={styles.subtitle}>{t('app.tagline')}</Text>

            <View style={styles.form}>
              <Input
                tone="onDark"
                label={t('auth.email')}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                autoComplete="email"
              />
              <Input
                tone="onDark"
                label={t('auth.password')}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                autoComplete="password"
                errorText={error ?? undefined}
              />

              <Button
                label={t('auth.signIn')}
                variant="primary"
                size="lg"
                loading={busy === 'email'}
                disabled={busy !== null}
                fullWidth
                onPress={onEmailSignIn}
              />

              <Pressable
                onPress={() => router.replace('/(auth)/sign-up')}
                hitSlop={8}
                style={styles.linkRow}
              >
                <Text style={styles.linkText}>
                  {t('auth.noAccount')}
                </Text>
              </Pressable>
            </View>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('common.or')}</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialGroup}>
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
              {facebookEnabled && (
                <SocialButton
                  label={t('auth.signInFacebook')}
                  loading={busy === 'facebook'}
                  disabled={busy !== null}
                  onPress={() => void runSocialSignIn('facebook', signInWithFacebook)}
                />
              )}
            </View>

            <Pressable onPress={onGuest} hitSlop={8} style={styles.guestRow}>
              <Text style={styles.guestText}>{t('auth.continueGuest')}</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'flex-end', padding: 24, paddingBottom: 32, gap: 14 },
  title: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    lineHeight: 21,
  },
  form: { gap: 12, marginTop: 8 },
  linkRow: { alignItems: 'center', paddingVertical: 4 },
  linkText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.22)' },
  dividerText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  guestRow: { alignItems: 'center', paddingVertical: 12 },
  guestText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  socialGroup: { gap: 12 },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.28)',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  socialBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
