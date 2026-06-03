import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';

const TERMS_BODY = `By using ScorePad, you agree to the following terms.

1. LICENSE
ScorePad grants you a personal, non-transferable, non-exclusive license to use the app on devices that you own or control.

2. ACCEPTABLE USE
You agree not to: (a) reverse-engineer the app, (b) use the app for any unlawful purpose, or (c) attempt to disrupt our services or other users' access.

3. PURCHASES & REFUNDS
Premium is a one-time, non-consumable in-app purchase. Refunds are governed by the policy of the platform store from which the app was purchased (Apple App Store or Google Play). We do not directly process refunds.

4. CONTENT
All match data you create remains your property. By using cloud sync, you grant us a limited license to store and transmit that data to provide the service to you.

5. DISCLAIMER
ScorePad is provided "as is" without warranties of any kind. We are not responsible for tournament outcomes, official scoring, or any decisions made based on data displayed by the app. Always defer to official scorers in competitive settings.

6. LIMITATION OF LIABILITY
To the maximum extent permitted by law, our liability is limited to the amount you have paid for the app in the past 12 months.

7. CHANGES
We may update these terms. Continued use after a change constitutes acceptance.

8. TERMINATION
We may terminate accounts that abuse the service. You may stop using the app at any time.

9. GOVERNING LAW
These terms are governed by the laws of your country of residence to the extent applicable.

10. CONTACT
Questions about these terms? Email support@scorepad.app.

Last updated: 2025`;

export default function Terms() {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ width: 44 }}>
          <Text style={{ color: theme.colors.text, fontSize: 24 }}>‹</Text>
        </Pressable>
        <Text
          style={{
            color: theme.colors.text,
            fontSize: 18,
            fontWeight: '700',
            fontFamily: theme.fonts.heading.bold,
            flex: 1,
            textAlign: 'center',
          }}
        >
          {t('settings.terms')}
        </Text>
        <View style={{ width: 44 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text style={{ color: theme.colors.text, fontSize: 14, lineHeight: 22 }}>
          {TERMS_BODY}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
