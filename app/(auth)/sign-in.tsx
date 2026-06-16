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
import { haptic } from '@/services/feedback';
import { useAuthStore } from '@/store/authStore';
import {
  signInWithEmail,
  signInWithApple,
  signInWithGoogle,
  signInWithFacebook,
} from '@/services/auth';
import { UserProfile } from '@/types';

const sportsBg = require('../../assets/images/sports-bg.jpg');
const facebookEnabled = Constants.expoConfig?.extra?.facebookEnabled === true;

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
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
}) {
  return (
    <Pressable
      onPress={() => {
        if (loading) return;
        haptic('light');
        onPress();
      }}
      disabled={loading}
      style={({ pressed }) => [
        styles.socialBtn,
        pressed && { backgroundColor: 'rgba(255,255,255,0.2)' },
        loading && { opacity: 0.6 },
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
  const [loading, setLoading] = useState(false);
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
    setLoading(true);
    try {
      const profile = await signInWithEmail(email.trim(), password);
      goAfterAuth(profile);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      setError(/wrong-password|user-not-found|invalid/i.test(msg)
        ? t('auth.errors.wrongPassword')
        : t('auth.errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  const onApple = async () => {
    try {
      setLoading(true);
      const profile = await signInWithApple();
      goAfterAuth(profile);
    } catch (e) {
      console.error('[AppleSignIn] error:', e);
      Alert.alert(t('auth.errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    try {
      setLoading(true);
      const profile = await signInWithGoogle();
      goAfterAuth(profile);
    } catch (e) {
      console.error('[GoogleSignIn] error:', e);
      if (__DEV__) {
        const err = e as {
          code?: string | number;
          message?: string;
          userInfo?: unknown;
        };
        Alert.alert(
          '[DEV] Google Sign-In error',
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
        Alert.alert(t('auth.errors.generic'));
      }
    } finally {
      setLoading(false);
    }
  };

  const onFacebook = async () => {
    try {
      setLoading(true);
      const profile = await signInWithFacebook();
      goAfterAuth(profile);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (!/cancelled/i.test(msg)) {
        Alert.alert(t('auth.errors.generic'));
      }
    } finally {
      setLoading(false);
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
                loading={loading}
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
              {Platform.OS === 'ios' && (
                <SocialButton
                  label={t('auth.signInApple')}
                  loading={loading}
                  onPress={onApple}
                />
              )}
              <GoogleSignInButton
                label={t('auth.signInGoogle')}
                loading={loading}
                fullWidth
                onPress={onGoogle}
              />
              {facebookEnabled && (
                <SocialButton
                  label={t('auth.signInFacebook')}
                  loading={loading}
                  onPress={onFacebook}
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
