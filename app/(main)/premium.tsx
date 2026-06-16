import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import {
  fetchCurrentOffering,
  getPremiumPackages,
  purchasePackage,
  restorePurchases,
  PremiumPackages,
} from '@/services/purchases';
import { logEvent } from '@/services/analytics';

type Plan = 'monthly' | 'yearly';

export default function PremiumScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const isPremium = useAuthStore((s) => s.isPremium);
  const [packages, setPackages] = useState<PremiumPackages | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  // Yearly is preselected since it's the better-value plan.
  const [plan, setPlan] = useState<Plan>('yearly');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const offering = await fetchCurrentOffering();
      if (cancelled) return;
      setPackages(getPremiumPackages(offering));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedPackage =
    plan === 'monthly' ? packages?.monthly ?? null : packages?.annual ?? null;

  const onBuy = async () => {
    if (!selectedPackage) {
      Alert.alert(t('premium.unavailable'));
      return;
    }
    setBusy(true);
    void logEvent('premium_buy_pressed', { plan });
    try {
      const { success, cancelled } = await purchasePackage(selectedPackage);
      if (!success && !cancelled) {
        Alert.alert(t('premium.purchaseFailed'));
      }
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

  // Localized store price when available, otherwise the static fallback price.
  const priceLabel = selectedPackage
    ? selectedPackage.product.priceString
    : plan === 'monthly'
      ? t('premium.priceMonthly')
      : t('premium.priceYearly');

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
            <PlanTabs
              plan={plan}
              onChange={setPlan}
              savingsPercent={packages?.annualSavingsPercent ?? null}
            />

            <View style={{ gap: 4, paddingHorizontal: 8 }}>
              <Feature icon="🚫" label={t('premium.features.noAds')} />
              <Feature icon="📊" label={t('premium.features.history')} />
              <Feature icon="📈" label={t('premium.features.stats')} />
              <Feature icon="☁️" label={t('premium.features.sync')} />
            </View>

            <View style={styles.priceArea}>
              {loading ? (
                <ActivityIndicator color={theme.colors.primary} />
              ) : (
                <>
                  <Text
                    style={{ color: theme.colors.text, fontSize: 36, fontWeight: '900' }}
                  >
                    {priceLabel}
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.textMuted,
                      fontSize: 16,
                      marginLeft: 6,
                      marginBottom: 6,
                    }}
                  >
                    {plan === 'monthly' ? t('premium.perMonth') : t('premium.perYear')}
                  </Text>
                </>
              )}
            </View>

            <Button
              label={t('premium.buy')}
              variant="gradient"
              gradientColors={theme.gradients.premium}
              size="lg"
              fullWidth
              loading={busy}
              disabled={loading}
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
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 2 }}>
      <Text style={{ fontSize: 24, marginRight: 14 }}>{icon}</Text>
      <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '600', flex: 1 }}>
        {label}
      </Text>
    </View>
  );
}

function PlanTabs({
  plan,
  onChange,
  savingsPercent,
}: {
  plan: Plan;
  onChange: (p: Plan) => void;
  savingsPercent: number | null;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const saveLabel =
    savingsPercent != null ? t('premium.savePercent', { percent: savingsPercent }) : t('premium.save');
  const tabs: { key: Plan; label: string }[] = [
    { key: 'monthly', label: t('premium.monthly') },
    { key: 'yearly', label: t('premium.yearly') },
  ];
  return (
    <View
      style={[
        styles.tabs,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      ]}
    >
      {tabs.map((tab) => {
        const active = plan === tab.key;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={[styles.tab, active && { backgroundColor: theme.colors.primary }]}
          >
            <Text
              style={[
                styles.tabLabel,
                { color: active ? theme.colors.textInverse : theme.colors.textMuted },
              ]}
            >
              {tab.label}
            </Text>
            {tab.key === 'yearly' && (
              <View
                style={[
                  styles.saveBadge,
                  { backgroundColor: active ? 'rgba(255,255,255,0.25)' : theme.colors.success },
                ]}
              >
                <Text style={styles.saveText}>{saveLabel}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
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
  priceArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 44,
  },
  tabs: {
    flexDirection: 'row',
    borderRadius: 999,
    borderWidth: 1,
    padding: 4,
    gap: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 999,
  },
  tabLabel: { fontSize: 15, fontWeight: '700' },
  saveBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  saveText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  alreadyBox: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 16,
  },
});
