import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/theme/ThemeProvider';

export default function PremiumIntro() {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      edges={['top', 'bottom']}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text
          style={{
            color: theme.colors.text,
            fontSize: 28,
            fontWeight: '800',
            fontFamily: theme.fonts.heading.bold,
            marginBottom: 8,
          }}
        >
          {t('onboarding.premium.title')}
        </Text>
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: 16,
            lineHeight: 22,
            marginBottom: 24,
          }}
        >
          {t('onboarding.premium.subtitle')}
        </Text>

        <Card style={{ marginBottom: 16 }}>
          <Text
            style={{
              color: theme.colors.text,
              fontSize: 18,
              fontWeight: '700',
              marginBottom: 6,
            }}
          >
            {t('onboarding.premium.freeTitle')}
          </Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: 14 }}>
            {t('onboarding.premium.freeFeatures')}
          </Text>
        </Card>

        <View style={{ borderRadius: 24, overflow: 'hidden' }}>
          <LinearGradient colors={theme.gradients.premium} style={{ padding: 20 }}>
            <Text
              style={{
                color: '#fff',
                fontSize: 20,
                fontWeight: '800',
                marginBottom: 6,
              }}
            >
              ⭐ {t('onboarding.premium.premiumTitle')}
            </Text>
            <Text style={{ color: '#FFFFFFCC', fontSize: 14, lineHeight: 20 }}>
              {t('onboarding.premium.premiumFeatures')}
            </Text>
          </LinearGradient>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={t('common.continue')}
          variant="primary"
          size="lg"
          fullWidth
          onPress={() => router.push('/(onboarding)/auth-intro')}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 24, paddingBottom: 32 },
  footer: { padding: 24 },
});
