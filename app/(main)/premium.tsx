import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import {
  fetchPremiumProduct,
  purchasePremium,
  restorePurchases,
  PremiumProductInfo,
} from '@/services/iap';
import { setUserPremiumFlag } from '@/services/firestore';
import { logEvent } from '@/services/analytics';

export default function PremiumScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const isPremium = useAuthStore((s) => s.isPremium);
  const [product, setProduct] = useState<PremiumProductInfo | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetchPremiumProduct().then(setProduct);
  }, []);

  // React to becoming premium (purchase listener fires asynchronously).
  useEffect(() => {
    if (isPremium) {
      void setUserPremiumFlag(true);
    }
  }, [isPremium]);

  const onBuy = async () => {
    setBusy(true);
    void logEvent('premium_buy_pressed');
    try {
      await purchasePremium();
    } catch {
      Alert.alert(t('premium.purchaseFailed'));
    } finally {
      setBusy(false);
    }
  };

  const onRestore = async () => {
    setBusy(true);
    try {
      const ok = await restorePurchases();
      Alert.alert(ok ? t('premium.restoreSuccess') : t('premium.restoreFailed'));
    } catch {
      Alert.alert(t('premium.restoreFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            // When opened from sign-in/sign-up via router.replace, there is no
            // back stack — fall through to (main) instead of getting stuck.
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(main)');
            }
          }}
          hitSlop={12}
        >
          <Text style={{ color: theme.colors.text, fontSize: 28 }}>×</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <LinearGradient
          colors={theme.gradients.premium}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={{ fontSize: 64, marginBottom: 12 }}>🏆</Text>
          <Text style={styles.heroTitle}>{t('premium.title')}</Text>
          <Text style={styles.heroSub}>{t('premium.subtitle')}</Text>
        </LinearGradient>

        {isPremium ? (
          <View style={[styles.alreadyBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={{ fontSize: 36, marginBottom: 8 }}>✨</Text>
            <Text
              style={{
                color: theme.colors.text,
                fontSize: 18,
                fontWeight: '700',
                marginBottom: 6,
                textAlign: 'center',
              }}
            >
              {t('premium.alreadyPremium')}
            </Text>
            <Text style={{ color: theme.colors.textMuted, textAlign: 'center' }}>
              {t('premium.thanks')}
            </Text>
          </View>
        ) : (
          <>
            <View style={{ gap: 14, paddingHorizontal: 8 }}>
              <Feature icon="🚫" label={t('premium.features.noAds')} />
              <Feature icon="📊" label={t('premium.features.history')} />
              <Feature icon="📈" label={t('premium.features.stats')} />
              <Feature icon="☁️" label={t('premium.features.sync')} />
            </View>

            <View
              style={[
                styles.priceBox,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            >
              <Text
                style={{ color: theme.colors.text, fontSize: 36, fontWeight: '900' }}
              >
                {product?.price ?? t('premium.price')}
              </Text>
              <Text style={{ color: theme.colors.textMuted, fontSize: 14, marginTop: 2 }}>
                {t('premium.oneTime')}
              </Text>
            </View>

            <Button
              label={t('premium.buy')}
              variant="gradient"
              gradientColors={theme.gradients.premium}
              size="lg"
              fullWidth
              loading={busy}
              onPress={onBuy}
              style={{ marginTop: 16 }}
            />
            <Button
              label={t('premium.restore')}
              variant="ghost"
              size="md"
              fullWidth
              onPress={onRestore}
              style={{ marginTop: 8 }}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Feature({ icon, label }: { icon: string; label: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
      <Text style={{ fontSize: 24, marginRight: 14 }}>{icon}</Text>
      <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '600', flex: 1 }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingVertical: 4 },
  scroll: { padding: 20, paddingTop: 8, paddingBottom: 48 },
  hero: {
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    marginBottom: 24,
  },
  heroTitle: { color: '#fff', fontSize: 26, fontWeight: '800', textAlign: 'center' },
  heroSub: {
    color: '#FFFFFFCC',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 22,
  },
  priceBox: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 16,
  },
  alreadyBox: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 16,
  },
});
