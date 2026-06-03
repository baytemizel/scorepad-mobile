import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { router, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useTheme } from '@/theme/ThemeProvider';
import {
  signInWithEmail,
  signInWithApple,
  signInWithGoogle,
  signInWithFacebook,
} from '@/services/auth';
import { UserProfile } from '@/types';

const facebookEnabled = Constants.expoConfig?.extra?.facebookEnabled === true;

/**
 * After any successful sign-in/sign-up, send the user to the premium upsell
 * if they aren't premium yet; otherwise straight to the main app.
 */
function goAfterAuth(profile: UserProfile): void {
  router.replace(profile.isPremium ? '/(main)' : '/(main)/premium');
}

export default function SignIn() {
  const theme = useTheme();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text
            style={{
              color: theme.colors.text,
              fontSize: 32,
              fontWeight: '800',
              fontFamily: theme.fonts.heading.bold,
              marginBottom: 8,
            }}
          >
            {t('auth.signIn')}
          </Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: 15, marginBottom: 24 }}>
            {t('app.tagline')}
          </Text>

          <View style={{ gap: 12 }}>
            <Input
              label={t('auth.email')}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              autoComplete="email"
            />
            <Input
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

            <Link href="/(auth)/sign-up" asChild>
              <Button label={t('auth.noAccount')} variant="ghost" size="md" fullWidth />
            </Link>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

          {Platform.OS === 'ios' && (
            <Button
              label={t('auth.signInApple')}
              variant="secondary"
              size="lg"
              fullWidth
              onPress={onApple}
              style={{ marginBottom: 12 }}
            />
          )}
          <Button
            label={t('auth.signInGoogle')}
            variant="secondary"
            size="lg"
            fullWidth
            onPress={onGoogle}
            style={{ marginBottom: 12 }}
          />
          {facebookEnabled && (
            <Button
              label={t('auth.signInFacebook')}
              variant="secondary"
              size="lg"
              fullWidth
              onPress={onFacebook}
              style={{ marginBottom: 12 }}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 24, paddingBottom: 48 },
  divider: { height: 1, marginVertical: 24 },
});
