import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from 'react-i18next';
import { MatchState, TeamSide } from '@/types';
import { getEngine, statsFitCenter } from '@/sports';
import { BigScore } from './BigScore';
import { ActionButton } from './ActionButton';

interface TeamPanelProps {
  state: MatchState;
  side: TeamSide;
  onAction: (side: TeamSide, action: string) => void;
}

/**
 * Half-width panel of the score screen. Shows team name, big score,
 * sport-specific stats, and a 2x2 grid of scoring actions.
 */
export function TeamPanel({ state, side, onAction }: TeamPanelProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const engine = getEngine(state.config.sport);

  const team = side === 'home' ? state.config.home : state.config.away;
  const score = engine.getDisplayScore(state, side);
  const stats = engine.getStatLines?.(state, side) ?? [];
  const actions = engine.availableActions(state, side);
  // Single-stat sports show the stat in the center bar instead of here.
  const showStats = stats.length > 0 && !statsFitCenter(engine, state);

  const teamColor = team.color || (side === 'home' ? theme.colors.homeTeam : theme.colors.awayTeam);
  const isAway = side === 'away';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bgElevated }]}>
      {/* Team name (away side mirrors home: dot on the right, text right-aligned) */}
      <View
        style={[
          styles.nameRow,
          isAway && { flexDirection: 'row-reverse' },
          { borderBottomColor: theme.colors.border },
        ]}
      >
        <View style={[styles.colorDot, { backgroundColor: teamColor }]} />
        <Text
          numberOfLines={1}
          allowFontScaling={false}
          style={{
            color: theme.colors.text,
            fontSize: 22,
            fontWeight: '700',
            flex: 1,
            textAlign: isAway ? 'right' : 'left',
          }}
        >
          {team.name || (side === 'home' ? t('common.home') : t('common.away'))}
        </Text>
      </View>

      {/* Big score */}
      <View style={styles.scoreArea}>
        <BigScore key={`${side}-${score}`} value={score} color={teamColor} />
      </View>

      {/* Stats row (multi-stat sports only; single-stat shows in center bar) */}
      {showStats && (
        <View style={styles.statsRow}>
          {stats.map((line, i) => (
            <View key={i} style={styles.statBlock}>
              <Text
                allowFontScaling={false}
                style={{ color: theme.colors.textMuted, fontSize: 11, fontWeight: '600' }}
              >
                {t(line.labelKey).toUpperCase()}
              </Text>
              <Text
                allowFontScaling={false}
                style={{
                  color: theme.colors.text,
                  fontSize: 22,
                  fontWeight: '700',
                  marginTop: 2,
                }}
              >
                {line.value}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Action grid */}
      <View style={styles.actionsGrid}>
        {actions.map((action, idx) => (
          <ActionButton
            key={action.id}
            action={action}
            onPress={() => onAction(side, action.id)}
            baseColor={teamColor}
            big={actions.length <= 2}
            style={{
              marginRight: idx % 2 === 0 && actions.length > 1 ? 8 : 0,
              marginBottom: idx < actions.length - 2 ? 8 : 0,
              minWidth: actions.length === 1 ? '100%' : '48%',
            }}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
    gap: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  scoreArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 4,
    flexWrap: 'wrap',
    gap: 8,
  },
  statBlock: {
    alignItems: 'center',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    minHeight: 130,
  },
});

export default TeamPanel;
