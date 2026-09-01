import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  ScrollView,
  LayoutAnimation,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SportIcon } from '@/components/common/SportIcon';
import { PremiumGate } from '@/components/common/PremiumGate';
import { MatchPeriodTimeline } from '@/components/scoring/MatchPeriodTimeline';
import { useAuthStore } from '@/store/authStore';
import { useMatchHistoryStore } from '@/store/matchHistoryStore';
import { sportList, headlineScore } from '@/sports';
import { SportId, MatchRecord } from '@/types';
import { deleteMatchFromCloud } from '@/services/firestore';
import { haptic } from '@/services/feedback';

export default function HistoryScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isPremium = useAuthStore((s) => s.isPremium);
  const records = useMatchHistoryStore((s) => s.records);
  const deleteMatch = useMatchHistoryStore((s) => s.deleteMatch);

  const [filter, setFilter] = useState<SportId | 'all'>('all');
  const [search, setSearch] = useState('');
  // Match History is premium-only, so a single expanded row (accordion) is
  // enough — tapping a row reveals its per-period timeline; tapping again or
  // opening another collapses it.
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = records;
    if (filter !== 'all') list = list.filter((r) => r.sport === filter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.homeName.toLowerCase().includes(q) ||
          r.awayName.toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => b.finishedAt - a.finishedAt);
  }, [records, filter, search]);

  // Guests have no account and nothing is saved for them — prompt to sign in.
  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }} edges={['top', 'bottom']}>
        <Header onBack={() => router.back()} title={t('history.title')} />
        <View style={styles.empty}>
          <Text style={{ fontSize: 56, marginBottom: 12 }}>🔒</Text>
          <Text
            style={{
              color: theme.colors.text,
              fontSize: 18,
              fontWeight: '700',
              marginBottom: 8,
              textAlign: 'center',
            }}
          >
            {t('history.guestTitle')}
          </Text>
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: 14,
              textAlign: 'center',
              marginBottom: 20,
            }}
          >
            {t('history.guestBody')}
          </Text>
          <Button
            label={t('auth.signIn')}
            variant="primary"
            onPress={() => router.push('/(auth)/sign-in')}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Signed-in but not premium: matches are saved to the cloud, but viewing
  // history stays a premium feature.
  if (!isPremium) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }} edges={['top', 'bottom']}>
        <Header onBack={() => router.back()} title={t('history.title')} />
        <PremiumGate titleKey="history.lockedTitle" bodyKey="history.lockedBody" />
      </SafeAreaView>
    );
  }

  const onDelete = (record: MatchRecord) => {
    Alert.alert(
      t('history.deleteConfirm'),
      t('history.deleteConfirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            haptic('warning');
            deleteMatch(record.id);
            void deleteMatchFromCloud(record.id);
          },
        },
      ],
    );
  };

  const toggleExpanded = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const renderItem = ({ item }: { item: MatchRecord }) => {
    const date = new Date(item.finishedAt).toLocaleDateString(i18n.language, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const expanded = expandedId === item.id;
    // Sets headline a set-based match; per-set points live in the timeline below.
    const score = headlineScore(
      { home: item.homeFinalScore, away: item.awayFinalScore },
      item.homeSets === undefined
        ? null
        : { home: item.homeSets, away: item.awaySets ?? 0 },
    );
    return (
      <Pressable
        onPress={() => toggleExpanded(item.id)}
        onLongPress={() => onDelete(item)}
      >
        <Card style={styles.card}>
          <View style={styles.cardTop}>
            <SportIcon sport={item.sport} size={44} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={styles.rowBetween}>
                <Text
                  numberOfLines={1}
                  style={{
                    color: theme.colors.text,
                    fontSize: 16,
                    fontWeight: '700',
                    flex: 1,
                  }}
                >
                  {item.homeName} <Text style={{ color: theme.colors.textMuted }}>vs</Text> {item.awayName}
                </Text>
                <Text
                  style={{
                    color: theme.colors.text,
                    fontSize: 18,
                    fontWeight: '900',
                  }}
                >
                  {score.home}–{score.away}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text
                  numberOfLines={1}
                  style={{ color: theme.colors.textMuted, fontSize: 12, flex: 1 }}
                >
                  {item.winner === 'draw'
                    ? t('history.draw')
                    : t('history.winner', {
                        name:
                          item.winner === 'home' ? item.homeName : item.awayName,
                      })}{' '}
                  · {date}
                </Text>
                <Text
                  style={{ color: theme.colors.textMuted, fontSize: 11, marginLeft: 8 }}
                  allowFontScaling={false}
                >
                  {expanded ? '▲' : '▼'}
                </Text>
              </View>
            </View>
          </View>

          {expanded && (
            <View style={styles.timelineWrap}>
              <View
                style={[styles.timelineDivider, { backgroundColor: theme.colors.border }]}
              />
              <MatchPeriodTimeline record={item} />
            </View>
          )}
        </Card>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }} edges={['top', 'bottom']}>
      <Header onBack={() => router.back()} title={t('history.title')} />

      <View style={{ paddingHorizontal: 24, gap: 12 }}>
        <Input
          placeholder={t('history.searchPlaceholder')}
          value={search}
          onChangeText={setSearch}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
        >
          {(['all', ...sportList.map((s) => s.meta.id)] as Array<SportId | 'all'>).map(
            (id) => {
              const isSelected = filter === id;
              const label =
                id === 'all'
                  ? t('history.filterAll')
                  : t(sportList.find((s) => s.meta.id === id)!.meta.nameKey);
              return (
                <Pressable
                  key={id}
                  onPress={() => setFilter(id)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected
                        ? theme.colors.primary
                        : theme.colors.surface,
                      borderColor: isSelected
                        ? theme.colors.primary
                        : theme.colors.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: isSelected ? theme.colors.textInverse : theme.colors.text,
                      fontSize: 13,
                      fontWeight: '600',
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            },
          )}
        </ScrollView>
      </View>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ fontSize: 56, marginBottom: 12 }}>📊</Text>
          <Text
            style={{
              color: theme.colors.text,
              fontSize: 18,
              fontWeight: '700',
              marginBottom: 8,
            }}
          >
            {t('history.empty')}
          </Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: 14, textAlign: 'center' }}>
            {t('history.emptyHint')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          extraData={expandedId}
          contentContainerStyle={{ padding: 24, gap: 12 }}
        />
      )}
    </SafeAreaView>
  );
}

function Header({ onBack, title }: { onBack: () => void; title: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
      <Pressable onPress={onBack} hitSlop={12} style={{ width: 44 }}>
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
        {title}
      </Text>
      <View style={{ width: 44 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  card: { padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  timelineWrap: { marginTop: 12 },
  timelineDivider: { height: StyleSheet.hairlineWidth, marginBottom: 12 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
});
