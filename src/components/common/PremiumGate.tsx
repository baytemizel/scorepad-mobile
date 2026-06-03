import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/components/ui/Button';

interface PremiumGateProps {
  titleKey: string;
  bodyKey: string;
}

export function PremiumGate({ titleKey, bodyKey }: PremiumGateProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.xl,
      }}
    >
      <LinearGradient
        colors={theme.gradients.premium}
        style={{
          width: 92,
          height: 92,
          borderRadius: 46,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: theme.spacing.xl,
        }}
      >
        <Text style={{ fontSize: 44 }}>🏆</Text>
      </LinearGradient>

      <Text
        style={{
          color: theme.colors.text,
          fontSize: 24,
          fontWeight: '700',
          textAlign: 'center',
          marginBottom: theme.spacing.md,
        }}
      >
        {t(titleKey)}
      </Text>
      <Text
        style={{
          color: theme.colors.textMuted,
          fontSize: 16,
          textAlign: 'center',
          marginBottom: theme.spacing.xl,
        }}
      >
        {t(bodyKey)}
      </Text>
      <Button
        label={t('history.unlock')}
        variant="gradient"
        gradientColors={theme.gradients.premium}
        onPress={() => router.push('/(main)/premium')}
        size="lg"
        fullWidth
      />
    </View>
  );
}

export default PremiumGate;
