import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';

const PRIVACY_BODY = `ScorePad ("we", "our", or "us") respects your privacy. This document explains what data the app collects, why, and how it is used.

1. ACCOUNT REQUIRED
ScorePad requires you to sign in with email, Apple, or Google to use the app. Match data is stored locally on your device. Without a Premium subscription, no match data leaves your device.

2. ACCOUNT DATA
If you sign in via email, Apple, or Google, we receive your email address and a unique account identifier from the provider. We do NOT receive your password.

3. CLOUD SYNC (PREMIUM ONLY)
If you purchase Premium, completed match records are synced to Firebase Firestore so they are available across your devices. Synced data includes: team names, scores, sport, period information, timestamps, and event log. We do not collect contacts, photos, or location.

4. ANALYTICS
We use Firebase Analytics to understand which features are used. Events are sent without any identifying information beyond an anonymous device-level identifier.

5. ADVERTISING
Free users see banner and interstitial ads served by Google AdMob. On iOS, we ask permission via App Tracking Transparency before any personalized advertising. Declining will result in less-relevant ads only — the ads themselves remain.

6. IN-APP PURCHASE
Premium is a one-time purchase processed by Apple App Store or Google Play Store. We do NOT receive your payment details. We only receive a confirmation that the purchase succeeded.

7. CHILDREN
ScorePad is not directed at children under 13.

8. DATA REMOVAL
You can delete your account and all associated cloud data by emailing support@scorepad.app from the address linked to your account. Local data is removed when you uninstall the app.

9. CONTACT
Questions? Email support@scorepad.app.

Last updated: 2025`;

export default function Privacy() {
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
          {t('settings.privacy')}
        </Text>
        <View style={{ width: 44 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text style={{ color: theme.colors.text, fontSize: 14, lineHeight: 22 }}>
          {PRIVACY_BODY}
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
