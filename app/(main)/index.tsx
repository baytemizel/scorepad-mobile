import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { fontFamilies } from '@/theme/fonts';
import { AdBanner } from '@/components/common/AdBanner';
import { sportList } from '@/sports';
import { useAuthStore } from '@/store/authStore';
import { logEvent } from '@/services/analytics';

export default function Home() {
  const theme = useTheme();
  const { t } = useTranslation();
  const isPremium = useAuthStore((s) => s.isPremium);

  const onSport = (sportId: string) => {
    void logEvent('home_sport_select', { sport: sportId });
    router.push({ pathname: '/match/setup', params: { sport: sportId } });
  };

  const iconBtnStyle = [
    styles.iconBtn,
    {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.brand, { color: theme.colors.text }]}>
              {t('app.name')}
            </Text>
            <Text style={{ color: theme.colors.textMuted, fontSize: 14 }}>
              {t('app.tagline')}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => router.push('/(main)/history')}
              style={iconBtnStyle}
              hitSlop={12}
              accessibilityLabel={t('home.history')}
            >
              <MaterialCommunityIcons name="history" size={22} color={theme.colors.text} />
            </Pressable>
            <Pressable
              onPress={() => router.push('/(main)/settings')}
              style={iconBtnStyle}
              hitSlop={12}
              accessibilityLabel={t('settings.title')}
            >
              <Ionicons name="cog-outline" size={22} color={theme.colors.text} />
            </Pressable>
          </View>
        </View>

        {!isPremium && (
          <Pressable onPress={() => router.push('/(main)/premium')}>
            <LinearGradient
              colors={theme.gradients.premium}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.premiumCta}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.premiumCtaTitle}>⭐ {t('home.premiumCta')}</Text>
                <Text style={styles.premiumCtaSub}>{t('home.premiumCtaSub')}</Text>
              </View>
              <Text style={styles.premiumCtaArrow}>›</Text>
            </LinearGradient>
          </Pressable>
        )}

        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: 13,
            fontWeight: '700',
            letterSpacing: 1,
            marginTop: 24,
            marginBottom: 12,
          }}
        >
          {t('home.pickSport').toUpperCase()}
        </Text>

        <View style={styles.sportGrid}>
          {sportList.map((engine) => (
            <Pressable
              key={engine.meta.id}
              onPress={() => onSport(engine.meta.id)}
              style={styles.sportTileWrap}
            >
              <LinearGradient
                colors={engine.meta.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.sportTile}
              >
                <MaterialCommunityIcons
                  name={
                    engine.meta.mdiIcon as React.ComponentProps<
                      typeof MaterialCommunityIcons
                    >['name']
                  }
                  size={48}
                  color="#fff"
                  style={styles.tileGlyphShadow}
                />
                <Text
                  numberOfLines={1}
                  style={[
                    styles.tileGlyphShadow,
                    {
                      color: '#fff',
                      fontSize: 16,
                      fontWeight: '700',
                      marginTop: 8,
                      textAlign: 'center',
                    },
                  ]}
                >
                  {t(engine.meta.nameKey)}
                </Text>
              </LinearGradient>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <AdBanner />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 24, paddingBottom: 48 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerActions: { flexDirection: 'row', gap: 10 },
  brand: { fontSize: 32, letterSpacing: 0.5, fontFamily: fontFamilies.logo },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  premiumCta: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 20,
  },
  premiumCtaTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  premiumCtaSub: { color: '#FFFFFFCC', fontSize: 13, marginTop: 2 },
  premiumCtaArrow: { color: '#fff', fontSize: 28, fontWeight: '900' },
  sportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  sportTileWrap: { width: '48%' },
  sportTile: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  tileGlyphShadow: {
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
