import React from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { getEngine } from '@/sports';
import { MatchState } from '@/types';

interface MatchSummaryModalProps {
  state: MatchState;
  visible: boolean;
  onBack: () => void;
  onShare: () => void;
}

/**
 * Full-screen, non-dismissable summary shown when a match finishes.
 * Header: Back (left), "SUMMARY" (center), Share (right).
 * Body: scrollable per-period breakdown of both teams.
 *
 * Rendered as an absolute-fill overlay (NOT a React Native <Modal>): the RN
 * Modal portals to a separate native view controller that severs the
 * SafeAreaProvider context and mis-sizes its host under our landscape lock,
 * leaving the content collapsed. Living inside the score screen's own view
 * tree keeps insets + layout working and lets it cover the screen reliably.
 */
export function MatchSummaryModal({
  state,
  visible,
  onBack,
  onShare,
}: MatchSummaryModalProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const engine = getEngine(state.config.sport);

  const homeName = state.config.home.name || t('common.home');
  const awayName = state.config.away.name || t('common.away');
  const homeColor =
    state.config.home.color || theme.colors.homeTeam;
  const awayColor =
    state.config.away.color || theme.colors.awayTeam;

  const homeFinal = engine.getDisplayScore(state, 'home');
  const awayFinal = engine.getDisplayScore(state, 'away');

  const winnerLabel =
    state.winner === 'home'
      ? homeName
      : state.winner === 'away'
        ? awayName
        : null;

  // Render one period per configured period, plus any extra completed periods
  // (set-based sports can run beyond config.periodCount in deciding sets).
  const periodCount = Math.max(
    state.config.periodCount,
    state.periods.length,
    state.currentPeriod + 1,
  );
  const periods = Array.from({ length: periodCount }, (_, i) => i);

  if (!visible) return null;

  return (
    <View
      style={[styles.overlay, { backgroundColor: theme.colors.bg }]}
      // Swallow touches so taps never fall through to the score buttons behind.
      pointerEvents="auto"
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            borderBottomColor: theme.colors.border,
            paddingTop: insets.top,
            paddingLeft: insets.left + 12,
            paddingRight: insets.right + 12,
          },
        ]}
      >
        <Pressable
          onPress={onBack}
          hitSlop={16}
          accessibilityLabel={t('common.back')}
          style={[
            styles.iconBtn,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="chevron-left"
            size={28}
            color={theme.colors.text}
          />
        </Pressable>

        <Text
          allowFontScaling={false}
          style={[styles.title, { color: theme.colors.text }]}
        >
          {t('score.summary')}
        </Text>

        <Pressable
          onPress={onShare}
          hitSlop={16}
          accessibilityLabel={t('score.share')}
          style={[
            styles.shareBtn,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text
            allowFontScaling={false}
            style={{
              color: theme.colors.text,
              fontSize: 14,
              fontWeight: '700',
            }}
          >
            {t('score.share')}
          </Text>
        </Pressable>
      </View>

      {/* Body */}
      <ScrollView
        style={styles.fill}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Final score banner */}
        <View
          style={[
            styles.finalCard,
            {
              backgroundColor: theme.colors.bgElevated,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.finalRow}>
            <View style={styles.finalTeam}>
              <View
                style={[styles.colorDot, { backgroundColor: homeColor }]}
              />
              <Text
                numberOfLines={1}
                allowFontScaling={false}
                style={[styles.finalName, { color: theme.colors.text }]}
              >
                {homeName}
              </Text>
            </View>
            <Text
              allowFontScaling={false}
              style={[styles.finalScore, { color: theme.colors.text }]}
            >
              {homeFinal} – {awayFinal}
            </Text>
            <View style={[styles.finalTeam, styles.finalTeamRight]}>
              <Text
                numberOfLines={1}
                allowFontScaling={false}
                style={[
                  styles.finalName,
                  { color: theme.colors.text, textAlign: 'right' },
                ]}
              >
                {awayName}
              </Text>
              <View
                style={[styles.colorDot, { backgroundColor: awayColor }]}
              />
            </View>
          </View>
          <Text
            allowFontScaling={false}
            style={[styles.winnerLine, { color: theme.colors.textMuted }]}
          >
            {winnerLabel
              ? t('score.winner', { name: winnerLabel })
              : t('score.draw')}
          </Text>
        </View>

        {/* Per-period breakdown */}
        {periods.map((periodIndex) => (
          <PeriodRow
            key={periodIndex}
            state={state}
            periodIndex={periodIndex}
            homeName={homeName}
            awayName={awayName}
            homeColor={homeColor}
            awayColor={awayColor}
          />
        ))}
      </ScrollView>
    </View>
  );
}

interface PeriodRowProps {
  state: MatchState;
  periodIndex: number;
  homeName: string;
  awayName: string;
  homeColor: string;
  awayColor: string;
}

function PeriodRow({
  state,
  periodIndex,
  homeName,
  awayName,
  homeColor,
  awayColor,
}: PeriodRowProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const engine = getEngine(state.config.sport);

  const homeSummary = engine.getPeriodSummary?.(state, periodIndex, 'home') ?? {
    score: 0,
    stats: [],
  };
  const awaySummary = engine.getPeriodSummary?.(state, periodIndex, 'away') ?? {
    score: 0,
    stats: [],
  };

  // Reuse the current status key with this period's index to get a
  // localized "Half 1 / 2", "Set 3", "Period 2 / 4" label.
  const status = engine.getStatusLabel({
    ...state,
    currentPeriod: periodIndex,
  });
  const label = t(status.key, {
    ...status.values,
    current: periodIndex + 1,
    total: state.config.periodCount,
  });

  return (
    <View
      style={[
        styles.periodCard,
        {
          backgroundColor: theme.colors.bgElevated,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <Text
        allowFontScaling={false}
        style={[styles.periodLabel, { color: theme.colors.textMuted }]}
      >
        {label.toUpperCase()}
      </Text>

      <View style={styles.periodBody}>
        <SideColumn
          align="left"
          name={homeName}
          color={homeColor}
          score={homeSummary.score}
          stats={homeSummary.stats}
        />
        <View style={styles.periodDivider} />
        <SideColumn
          align="right"
          name={awayName}
          color={awayColor}
          score={awaySummary.score}
          stats={awaySummary.stats}
        />
      </View>
    </View>
  );
}

interface SideColumnProps {
  align: 'left' | 'right';
  name: string;
  color: string;
  score: number;
  stats: { labelKey: string; value: string | number }[];
}

function SideColumn({ align, name, color, score, stats }: SideColumnProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const isRight = align === 'right';
  const textAlign = isRight ? 'right' : 'left';

  return (
    <View style={styles.sideColumn}>
      <View
        style={[
          styles.sideNameRow,
          isRight && { flexDirection: 'row-reverse' },
        ]}
      >
        <View style={[styles.colorDot, { backgroundColor: color }]} />
        <Text
          numberOfLines={1}
          allowFontScaling={false}
          style={{
            color: theme.colors.text,
            fontSize: 14,
            fontWeight: '700',
            textAlign,
            flex: 1,
          }}
        >
          {name}
        </Text>
      </View>

      <Text
        allowFontScaling={false}
        style={{
          color: theme.colors.text,
          fontSize: 36,
          fontWeight: '900',
          letterSpacing: -1,
          textAlign,
          marginTop: 4,
        }}
      >
        {score}
      </Text>

      {stats.length > 0 && (
        <View style={[styles.statRows, { alignItems: isRight ? 'flex-end' : 'flex-start' }]}>
          {stats.map((s, i) => (
            <Text
              key={i}
              allowFontScaling={false}
              style={{
                color: theme.colors.textMuted,
                fontSize: 12,
                fontWeight: '600',
                marginTop: 2,
                textAlign,
              }}
            >
              {t(s.labelKey)}: {s.value}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    // Sit above the score row + the parent back button.
    zIndex: 100,
    elevation: 100,
  },
  header: {
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  shareBtn: {
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 10,
  },
  finalCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  finalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  finalTeam: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  finalTeamRight: {
    justifyContent: 'flex-end',
  },
  finalName: {
    fontSize: 16,
    fontWeight: '700',
    flexShrink: 1,
  },
  finalScore: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1,
  },
  winnerLine: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  periodCard: {
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
  },
  periodLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  periodBody: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  periodDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#888',
    opacity: 0.25,
    marginHorizontal: 12,
  },
  sideColumn: {
    flex: 1,
  },
  sideNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statRows: {
    marginTop: 4,
  },
});

export default MatchSummaryModal;
