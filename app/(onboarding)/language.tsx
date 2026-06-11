import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/theme/ThemeProvider';
import { supportedLanguages, changeLanguage } from '@/localization/i18n';
import { useSettingsStore } from '@/store/settingsStore';

export default function LanguageOnboarding() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const [selected, setSelected] = React.useState(i18n.language);

  const handleSelect = async (lng: string) => {
    setSelected(lng);
    await changeLanguage(lng);
    setLanguage(lng);
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      edges={['top', 'bottom']}
    >
      <View style={{ padding: 24 }}>
        <Text
          style={{
            color: theme.colors.text,
            fontSize: 28,
            fontWeight: '800',
            fontFamily: theme.fonts.heading.bold,
            marginBottom: 8,
          }}
        >
          {t('onboarding.language.title')}
        </Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: 16, lineHeight: 22 }}>
          {t('onboarding.language.subtitle')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}>
        {supportedLanguages.map((l) => {
          const isSelected = selected === l.code;
          return (
            <Pressable
              key={l.code}
              onPress={() => handleSelect(l.code)}
              style={[
                styles.row,
                {
                  backgroundColor: isSelected
                    ? theme.colors.primary
                    : theme.colors.surface,
                  borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                },
              ]}
            >
              <Text
                style={{
                  color: isSelected ? theme.colors.textInverse : theme.colors.text,
                  fontSize: 17,
                  fontWeight: '600',
                }}
              >
                {l.label}
              </Text>
              {isSelected && (
                <Text style={{ color: theme.colors.textInverse, fontSize: 18 }}>✓</Text>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ padding: 24 }}>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
});
