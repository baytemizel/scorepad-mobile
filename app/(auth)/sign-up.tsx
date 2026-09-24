import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  ImageBackground,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { emailAuthEnabled, signUpWithEmail } from '@/services/auth';

const sportsBg = require('../../assets/images/sports-bg.jpg');

export default function SignUpRoute() {
  // Email sign-up is switched off for now (see emailAuthEnabled); anything
  // that still links here lands on the provider sign-in instead.
  if (!emailAuthEnabled) return <Redirect href="/(auth)/sign-in" />;
  return <SignUp />;
}

function SignUp() {
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
            <Text style={styles.title}>{t('auth.signUp')}</Text>
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

              <Pressable
                onPress={() => router.replace('/(auth)/sign-in')}
                hitSlop={8}
                style={styles.linkRow}
              >
                <Text style={styles.linkText}>{t('auth.haveAccount')}</Text>
              </Pressable>
            </View>
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
});
