import React, { useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { getEngine, PeriodSummary } from '@/sports';
import { MatchState } from '@/types';

const EMPTY_SUMMARY: PeriodSummary = { score: 0, stats: [] };

/**
 * Live, top-to-bottom timeline of the match's period/set/half flow, for the
 * PORTRAIT score screen. Renders one block per period reached so far
 * (0 .. currentPeriod), highlighting the active one. Reuses each sport engine's
 * getPeriodSummary / getStatusLabel — the same logic the summary modal and the
 * history timeline use — so no new per-sport code is needed.
 *
 * Visuals (rail + node + score row) mirror MatchPeriodTimeline; kept as a
 * separate component because the live data source is a MatchState (not a
 * finished MatchRecord) and the current period needs an emphasized node.
 */
export function LiveMatchTimeline({ state }: { state: MatchState }) {
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);

  const periodIndices = useMemo(
    () => Array.from({ length: state.currentPeriod + 1 }, (_, i) => i),
    [state.currentPeriod],
  );

  const homeColor = state.config.home.color || theme.colors.homeTeam;
  const awayColor = state.config.away.color || theme.colors.awayTeam;

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      // Keep the active period in view as the match advances.
      onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
    >
      {periodIndices.map((i) => (
        <TimelineRow
          key={i}
          state={state}
          periodIndex={i}
          isFirst={i === 0}
          isLast={i === periodIndices.length - 1}
          isCurrent={i === state.currentPeriod && !state.finished}
          homeColor={homeColor}
          awayColor={awayColor}
        />
      ))}
    </ScrollView>
  );
}

interface TimelineRowProps {
  state: MatchState;
  periodIndex: number;
  isFirst: boolean;
  isLast: boolean;
  isCurrent: boolean;
  homeColor: string;
  awayColor: string;
}

function TimelineRow({
  state,
  periodIndex,
  isFirst,
  isLast,
  isCurrent,
  homeColor,
  awayColor,
}: TimelineRowProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const engine = getEngine(state.config.sport);

  const home = engine.getPeriodSummary?.(state, periodIndex, 'home') ?? EMPTY_SUMMARY;
  const away = engine.getPeriodSummary?.(state, periodIndex, 'away') ?? EMPTY_SUMMARY;

  // Reuse the live status key with this period's index → localized
  // "Set 3", "Half 1 / 2", "Period 2 / 4" without any new strings.
  const status = engine.getStatusLabel({ ...state, currentPeriod: periodIndex });
  const label = t(status.key, {
    ...status.values,
    current: periodIndex + 1,
    total: state.config.periodCount,
  });

  const homeStats = formatStats(home, t);
  const awayStats = formatStats(away, t);
  const hasStats = homeStats.length > 0 || awayStats.length > 0;

  const line = theme.colors.border;
  const nodeFill = isCurrent ? theme.colors.primary : theme.colors.bg;

  return (
    <View style={styles.row}>
      {/* Rail: connector line + node dot (filled for the active period). */}
      <View style={styles.rail}>
        <View
          style={[styles.railSeg, { backgroundColor: isFirst ? 'transparent' : line }]}
        />
        <View
          style={[
            styles.node,
            { borderColor: theme.colors.primary, backgroundColor: nodeFill },
          ]}
        />
        <View
          style={[styles.railSegFlex, { backgroundColor: isLast ? 'transparent' : line }]}
        />
      </View>

      {/* Content: period label + score, optional per-side stats. */}
      <View style={styles.content}>
        <View style={styles.scoreRow}>
          <Text
            style={[
              styles.periodLabel,
              {
                color: isCurrent ? theme.colors.text : theme.colors.textMuted,
                fontWeight: isCurrent ? '900' : '700',
              },
            ]}
            numberOfLines={1}
          >
            {label.toUpperCase()}
          </Text>
          <Text style={styles.score} allowFontScaling={false}>
            <Text
              style={{
                color: homeColor,
                fontWeight: home.score >= away.score ? '900' : '600',
              }}
            >
              {home.score}
            </Text>
            <Text style={{ color: theme.colors.textMuted }}> – </Text>
            <Text
              style={{
                color: awayColor,
                fontWeight: away.score >= home.score ? '900' : '600',
              }}
            >
              {away.score}
            </Text>
          </Text>
        </View>

        {hasStats && (
          <View style={styles.statsRow}>
            <Text
              style={[styles.statsText, { color: theme.colors.textMuted }]}
              numberOfLines={1}
            >
              {homeStats}
            </Text>
            <Text
              style={[
                styles.statsText,
                styles.statsTextRight,
                { color: theme.colors.textMuted },
              ]}
              numberOfLines={1}
            >
              {awayStats}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function formatStats(
  summary: PeriodSummary,
  t: (key: string) => string,
): string {
  return summary.stats
    .filter((s) => Number(s.value) > 0)
    .map((s) => `${t(s.labelKey)} ${s.value}`)
    .join(' · ');
}

const NODE = 12;
const RAIL_TOP = 8;

const styles = StyleSheet.create({
  scroll: {
    alignSelf: 'stretch',
  },
  scrollContent: {
    paddingHorizontal: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  rail: {
    width: 24,
    alignItems: 'center',
  },
  railSeg: {
    width: 2,
    height: RAIL_TOP,
  },
  railSegFlex: {
    width: 2,
    flex: 1,
  },
  node: {
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    borderWidth: 2,
  },
  content: {
    flex: 1,
    paddingBottom: 10,
    paddingLeft: 4,
  },
  scoreRow: {
    minHeight: 2 * RAIL_TOP + NODE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  periodLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    flexShrink: 1,
  },
  score: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: -2,
  },
  statsText: {
    fontSize: 11,
    fontWeight: '600',
    flexShrink: 1,
  },
  statsTextRight: {
    textAlign: 'right',
  },
});

export default LiveMatchTimeline;
