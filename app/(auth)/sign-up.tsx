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
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useTheme } from '@/theme/ThemeProvider';
import { signUpWithEmail } from '@/services/auth';

export default function SignUp() {
  const theme = useTheme();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSignUp = async () => {
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
      const profile = await signUpWithEmail(email.trim(), password);
      // New account is never premium yet — go straight to the premium screen.
      router.replace(profile.isPremium ? '/(main)' : '/(main)/premium');
    } catch (e) {
      console.error('[SignUp] error:', e);
      const err = e as { code?: string; message?: string };
      // Map common Firebase errors to clearer text.
      const code = err.code ?? '';
      if (/email-already-in-use/i.test(code)) {
        setError(t('auth.errors.emailInUse'));
      } else if (/weak-password/i.test(code)) {
        setError(t('auth.errors.weakPassword'));
      } else if (/invalid-email/i.test(code)) {
        setError(t('auth.errors.invalidEmail'));
      } else {
        setError(t('auth.errors.generic'));
      }
      if (__DEV__) {
        Alert.alert(
          '[DEV] Sign-up error',
          `code: ${code || 'n/a'}\nmessage: ${err.message ?? String(e)}`,
        );
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
              marginBottom: 24,
            }}
          >
            {t('auth.signUp')}
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
              autoComplete="password-new"
              errorText={error ?? undefined}
            />
            <Button
              label={t('auth.signUp')}
              variant="primary"
              size="lg"
              loading={loading}
              fullWidth
              onPress={onSignUp}
            />
            <Link href="/(auth)/sign-in" asChild>
              <Button label={t('auth.haveAccount')} variant="ghost" size="md" fullWidth />
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 24, paddingBottom: 48 },
});
