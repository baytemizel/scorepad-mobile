import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { getEngine, PeriodSummary } from '@/sports';
import { MatchRecord, MatchState, TeamSide } from '@/types';

/**
 * Rebuilds a minimal MatchState from a persisted MatchRecord so we can reuse
 * the sport engines' getPeriodSummary / getStatusLabel — the exact logic the
 * end-of-match MatchSummaryModal uses — to render a per-period breakdown.
 *
 * MatchRecord doesn't persist `config` or `meta`, so we infer what the engines
 * need:
 *  - periodCount from the data itself (completed periods + highest event period),
 *  - basketball foul meta from the stored foul events. Every other sport reads
 *    its per-period score/stats straight from `events`/`periods`, so leaving
 *    `meta` empty for them is safe.
 */
function recordToState(record: MatchRecord): MatchState {
  const maxEventPeriod = record.events.reduce(
    (max, e) => Math.max(max, e.periodIndex),
    -1,
  );
  const periodCount = Math.max(record.periods.length, maxEventPeriod + 1, 1);

  let meta: Record<string, unknown> = {};
  if (record.sport === 'basketball') {
    const homeFouls = Array(periodCount).fill(0);
    const awayFouls = Array(periodCount).fill(0);
    for (const e of record.events) {
      if (e.action !== 'foul') continue;
      if (e.periodIndex < 0 || e.periodIndex >= periodCount) continue;
      if (e.side === 'home') homeFouls[e.periodIndex] += 1;
      else awayFouls[e.periodIndex] += 1;
    }
    meta = { homeFouls, awayFouls };
  } else if (record.sport === 'tennis') {
    // Only consulted for a set that was still in progress when the match was
    // ended early; completed sets come from `periods` and ignore meta.
    meta = { homeGames: record.homeFinalScore, awayGames: record.awayFinalScore };
  }

  return {
    id: record.id,
    config: {
      sport: record.sport,
      home: { id: 'home', name: record.homeName, color: '' },
      away: { id: 'away', name: record.awayName, color: '' },
      periodCount,
    },
    homeScore: record.homeFinalScore,
    awayScore: record.awayFinalScore,
    currentPeriod: Math.max(0, periodCount - 1),
    periods: record.periods,
    events: record.events,
    meta,
    finished: true,
    startedAt: record.startedAt,
    finishedAt: record.finishedAt,
    winner: record.winner,
  };
}

const EMPTY_SUMMARY: PeriodSummary = { score: 0, stats: [] };

/**
 * Vertical, top-to-bottom timeline of a finished match's period/set/half flow.
 * Shown when a Match History row is expanded. Score-first, with each side's
 * non-zero per-period stats (fouls, cards, corners) as a compact muted line.
 */
export function MatchPeriodTimeline({ record }: { record: MatchRecord }) {
  const theme = useTheme();
  const { t } = useTranslation();

  const { state, periodIndices } = useMemo(() => {
    const st = recordToState(record);
    return {
      state: st,
      periodIndices: Array.from({ length: st.config.periodCount }, (_, i) => i),
    };
  }, [record]);

  const homeColor = theme.colors.homeTeam;
  const awayColor = theme.colors.awayTeam;

  return (
    <View>
      {/* Legend: maps the score colors to team names. */}
      <View style={styles.legend}>
        <LegendItem color={homeColor} name={record.homeName || t('common.home')} />
        <LegendItem
          color={awayColor}
          name={record.awayName || t('common.away')}
          alignRight
        />
      </View>

      {periodIndices.map((i) => (
        <TimelineRow
          key={i}
          state={state}
          periodIndex={i}
          isFirst={i === 0}
          isLast={i === periodIndices.length - 1}
          homeColor={homeColor}
          awayColor={awayColor}
        />
      ))}
    </View>
  );
}

function LegendItem({
  color,
  name,
  alignRight,
}: {
  color: string;
  name: string;
  alignRight?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.legendItem, alignRight && styles.legendItemRight]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text
        numberOfLines={1}
        style={{ color: theme.colors.textMuted, fontSize: 12, fontWeight: '600' }}
      >
        {name}
      </Text>
    </View>
  );
}

interface TimelineRowProps {
  state: MatchState;
  periodIndex: number;
  isFirst: boolean;
  isLast: boolean;
  homeColor: string;
  awayColor: string;
}

function TimelineRow({
  state,
  periodIndex,
  isFirst,
  isLast,
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

  return (
    <View style={styles.row}>
      {/* Rail: connector line + node dot. */}
      <View style={styles.rail}>
        <View
          style={[
            styles.railSeg,
            { backgroundColor: isFirst ? 'transparent' : line },
          ]}
        />
        <View
          style={[
            styles.node,
            { borderColor: theme.colors.primary, backgroundColor: theme.colors.bg },
          ]}
        />
        <View
          style={[
            styles.railSegFlex,
            { backgroundColor: isLast ? 'transparent' : line },
          ]}
        />
      </View>

      {/* Content: period label + score, optional per-side stats. */}
      <View style={styles.content}>
        <View style={styles.scoreRow}>
          <Text
            style={[styles.periodLabel, { color: theme.colors.textMuted }]}
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

// Dot center sits at railSeg height + half the node, matched to scoreRow's
// vertical center so the node aligns with the period label / score line.
const NODE = 12;
const RAIL_TOP = 12;

const styles = StyleSheet.create({
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  legendItemRight: {
    flexDirection: 'row-reverse',
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
    paddingBottom: 14,
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
    fontWeight: '700',
    letterSpacing: 1.2,
    flexShrink: 1,
  },
  score: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: -4,
  },
  statsText: {
    fontSize: 11,
    fontWeight: '600',
    flexShrink: 1,
  },
  statsTextRight: {
    textAlign: 'right',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default MatchPeriodTimeline;
