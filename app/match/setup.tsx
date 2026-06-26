import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { SportIcon } from '@/components/common/SportIcon';
import { AdBanner } from '@/components/common/AdBanner';
import { sportEngines } from '@/sports';
import { SportId, MatchConfig, TennisFormat } from '@/types';
import { useMatchStore } from '@/store/matchStore';
import { logEvent } from '@/services/analytics';

const PERIOD_OPTIONS: Record<SportId, number[]> = {
  basketball: [2, 4],
  football: [2],
  handball: [2],
  volleyball: [3, 5],
  tennis: [3, 5],
  tabletennis: [3, 5, 7],
};

interface Preset {
  key: string;
  periods: number;
}

const PRESETS: Record<SportId, Preset[]> = {
  basketball: [
    { key: 'quick', periods: 2 },
    { key: 'standard', periods: 4 },
    { key: 'tournament', periods: 4 },
  ],
  football: [
    { key: 'quick', periods: 2 },
    { key: 'standard', periods: 2 },
    { key: 'tournament', periods: 2 },
  ],
  handball: [
    { key: 'quick', periods: 2 },
    { key: 'standard', periods: 2 },
    { key: 'tournament', periods: 2 },
  ],
  volleyball: [
    { key: 'quick', periods: 3 },
    { key: 'standard', periods: 3 },
    { key: 'tournament', periods: 5 },
  ],
  tennis: [
    { key: 'quick', periods: 3 },
    { key: 'standard', periods: 3 },
    { key: 'tournament', periods: 5 },
  ],
  tabletennis: [
    { key: 'quick', periods: 3 },
    { key: 'standard', periods: 5 },
    { key: 'tournament', periods: 7 },
  ],
};

export default function MatchSetup() {
  const theme = useTheme();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ sport: string }>();
  const sportId = (params.sport as SportId) || 'basketball';
  const engine = sportEngines[sportId];
  const startMatch = useMatchStore((s) => s.startMatch);

  const [homeName, setHomeName] = useState('');
  const [awayName, setAwayName] = useState('');
  const [periodCount, setPeriodCount] = useState(engine.meta.defaultPeriodCount);
  const [tennisFormat, setTennisFormat] = useState<TennisFormat>('best-of-3');
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const periodOptions = PERIOD_OPTIONS[sportId];
  const presets = PRESETS[sportId];

  const onPreset = (key: string) => {
    const p = presets.find((x) => x.key === key);
    if (!p) return;
    setPeriodCount(p.periods);
    setActivePreset(key);
  };

  const onStart = () => {
    const tennisPeriods = tennisFormat === 'best-of-5' ? 5 : 3;
    const finalPeriodCount = sportId === 'tennis' ? tennisPeriods : periodCount;

    const config: MatchConfig = {
      sport: sportId,
      home: {
        id: 'home',
        name: homeName.trim() || t('common.home'),
        color: theme.colors.homeTeam,
      },
      away: {
        id: 'away',
        name: awayName.trim() || t('common.away'),
        color: theme.colors.awayTeam,
      },
      periodCount: finalPeriodCount,
      bestOf: engine.meta.setBased ? finalPeriodCount : undefined,
      allowOvertime: true,
      tennisFormat: sportId === 'tennis' ? tennisFormat : undefined,
    };
    void logEvent('match_start', { sport: sportId, periods: finalPeriodCount });
    startMatch(config);
    router.replace('/match/score');
  };

  const periodLabel = useMemo(() => {
    if (sportId === 'football' || sportId === 'handball') return t('setup.halves');
    if (engine.meta.setBased) return t('setup.bestOf');
    return t('setup.periods');
  }, [sportId, t, engine]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
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
            {t('setup.title')}
          </Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.sportBadgeRow}>
            <SportIcon sport={sportId} size={48} />
            <Text
              style={{
                color: theme.colors.text,
                fontSize: 20,
                fontWeight: '700',
                marginLeft: 12,
              }}
            >
              {t(engine.meta.nameKey)}
            </Text>
          </View>

          <Card style={{ gap: 12 }}>
            <Input
              label={t('setup.homeTeam')}
              placeholder={t('setup.homeTeamPlaceholder')}
              value={homeName}
              onChangeText={setHomeName}
              maxLength={24}
            />
            <Input
              label={t('setup.awayTeam')}
              placeholder={t('setup.awayTeamPlaceholder')}
              value={awayName}
              onChangeText={setAwayName}
              maxLength={24}
            />
          </Card>

          {/* Presets */}
          <View>
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: 12,
                fontWeight: '700',
                letterSpacing: 1,
                marginBottom: 8,
                marginLeft: 4,
              }}
            >
              {t('setup.presets').toUpperCase()}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {presets.map((p) => {
                const isActive = activePreset === p.key;
                return (
                  <Pressable
                    key={p.key}
                    onPress={() => onPreset(p.key)}
                    style={[
                      styles.presetChip,
                      {
                        backgroundColor: isActive
                          ? theme.colors.primary
                          : theme.colors.surface,
                        borderColor: isActive ? theme.colors.primary : theme.colors.border,
                        flex: 1,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: isActive ? theme.colors.textInverse : theme.colors.text,
                        fontWeight: '700',
                        fontSize: 14,
                      }}
                    >
                      {t(`setup.preset.${p.key}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Periods / Best-of (skipped for tennis since tennisFormat covers it) */}
          {periodOptions.length > 1 && sportId !== 'tennis' && (
            <View>
              <Text
                style={{
                  color: theme.colors.textMuted,
                  fontSize: 12,
                  fontWeight: '700',
                  letterSpacing: 1,
                  marginBottom: 8,
                  marginLeft: 4,
                }}
              >
                {periodLabel.toUpperCase()}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {periodOptions.map((n) => {
                  const isActive = periodCount === n;
                  return (
                    <Pressable
                      key={n}
                      onPress={() => {
                        setPeriodCount(n);
                        setActivePreset(null);
                      }}
                      style={[
                        styles.numChip,
                        {
                          backgroundColor: isActive
                            ? theme.colors.primary
                            : theme.colors.surface,
                          borderColor: isActive ? theme.colors.primary : theme.colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: isActive ? theme.colors.textInverse : theme.colors.text,
                          fontWeight: '800',
                          fontSize: 18,
                        }}
                      >
                        {n}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Tennis format */}
          {sportId === 'tennis' && (
            <View>
              <Text
                style={{
                  color: theme.colors.textMuted,
                  fontSize: 12,
                  fontWeight: '700',
                  letterSpacing: 1,
                  marginBottom: 8,
                  marginLeft: 4,
                }}
              >
                {t('setup.tennisFormat').toUpperCase()}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['best-of-3', 'best-of-5'] as TennisFormat[]).map((f) => {
                  const isActive = tennisFormat === f;
                  return (
                    <Pressable
                      key={f}
                      onPress={() => setTennisFormat(f)}
                      style={[
                        styles.presetChip,
                        {
                          backgroundColor: isActive
                            ? theme.colors.primary
                            : theme.colors.surface,
                          borderColor: isActive ? theme.colors.primary : theme.colors.border,
                          flex: 1,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: isActive ? theme.colors.textInverse : theme.colors.text,
                          fontWeight: '700',
                          fontSize: 14,
                        }}
                      >
                        {t(f === 'best-of-3' ? 'setup.bestOf3' : 'setup.bestOf5')}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>

        <View style={{ padding: 20, paddingBottom: 8 }}>
          <Button
            label={t('setup.startMatch')}
            variant="gradient"
            gradientColors={engine.meta.gradient}
            size="lg"
            fullWidth
            onPress={onStart}
          />
        </View>
        <AdBanner />
      </KeyboardAvoidingView>
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
  sportBadgeRow: { flexDirection: 'row', alignItems: 'center' },
  presetChip: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
  },
  numChip: {
    paddingVertical: 14,
    paddingHorizontal: 22,
    minWidth: 64,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
  },
});
