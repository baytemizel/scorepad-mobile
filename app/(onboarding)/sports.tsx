import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SportIcon } from '@/components/common/SportIcon';
import { useTheme } from '@/theme/ThemeProvider';
import { sportList } from '@/sports';

export default function SportsShowcase() {
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
          {t('onboarding.sports.title')}
        </Text>
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: 16,
            lineHeight: 22,
            marginBottom: 24,
          }}
        >
          {t('onboarding.sports.subtitle')}
        </Text>

        <View style={{ gap: 12 }}>
          {sportList.map((engine) => (
            <Card key={engine.meta.id} style={styles.row}>
              <SportIcon sport={engine.meta.id} size={48} />
              <Text
                style={{
                  color: theme.colors.text,
                  fontSize: 18,
                  fontWeight: '600',
                  marginLeft: 16,
                }}
              >
                {t(engine.meta.nameKey)}
              </Text>
            </Card>
          ))}
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
  row: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  footer: { padding: 24 },
});
