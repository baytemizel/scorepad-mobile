import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettingsStore } from '@/store/settingsStore';
import { logEvent } from '@/services/analytics';

export default function AuthIntro() {
  const theme = useTheme();
  const { t } = useTranslation();
  const setOnboardingCompleted = useSettingsStore((s) => s.setOnboardingCompleted);

  const goSignIn = () => {
    setOnboardingCompleted(true);
    void logEvent('onboarding_complete', { mode: 'sign_in' });
    router.replace('/(auth)/sign-in');
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      edges={['top', 'bottom']}
    >
      <View style={styles.content}>
        <Text
          style={{
            color: theme.colors.text,
            fontSize: 28,
            fontWeight: '800',
            fontFamily: theme.fonts.heading.bold,
            marginBottom: 8,
            textAlign: 'center',
          }}
        >
          {t('onboarding.auth.title')}
        </Text>
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: 16,
            textAlign: 'center',
            lineHeight: 22,
            marginBottom: 32,
          }}
        >
          {t('onboarding.auth.subtitle')}
        </Text>
      </View>

      <View style={styles.footer}>
        <Button
          label={t('onboarding.auth.createAccount')}
          variant="primary"
          size="lg"
          fullWidth
          onPress={goSignIn}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  footer: { padding: 24 },
});
