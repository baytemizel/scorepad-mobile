import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from 'react-i18next';
import { MatchState, TeamSide } from '@/types';
import { getEngine, SportAction, statsFitCenter } from '@/sports';
import { BigScore } from './BigScore';
import { ActionButton } from './ActionButton';

type PanelOrientation = 'landscape' | 'portrait';

/** Portrait lays the actions out two to a row. */
const PORTRAIT_COLUMNS = 2;
/**
 * Portrait row height before it grows. Rows start here and then share the
 * screen's free space (see `containerPortrait`), so on a tall phone the buttons
 * end up well above this. Fixed rather than content-sized on purpose: the
 * buttons size their text from the height they get, so letting the text feed
 * back into the row height would make the two chase each other.
 */
const PORTRAIT_ROW_BASE = 46;

interface TeamPanelProps {
  state: MatchState;
  side: TeamSide;
  onAction: (side: TeamSide, action: string) => void;
  orientation?: PanelOrientation;
}

/**
 * One team's panel of the score screen. Shows team name, big score,
 * sport-specific stats, and the scoring actions.
 *
 * Landscape: a tall half-width column (name → score → actions in one row).
 * Portrait: a full-width block (name + score inline, actions two to a row)
 * that grows with the screen, so the buttons use the height a tall phone has
 * instead of leaving it all to the timeline.
 */
export function TeamPanel({
  state,
  side,
  onAction,
  orientation = 'landscape',
}: TeamPanelProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const engine = getEngine(state.config.sport);

  const team = side === 'home' ? state.config.home : state.config.away;
  const score = engine.getDisplayScore(state, side);
  const stats = engine.getStatLines?.(state, side) ?? [];
  const actions = engine.availableActions(state, side);
  // Single-stat sports show the stat in the center/control bar instead of here.
  const showStats = stats.length > 0 && !statsFitCenter(engine, state);

  const teamColor =
    team.color || (side === 'home' ? theme.colors.homeTeam : theme.colors.awayTeam);
  const isAway = side === 'away';
  const isPortrait = orientation === 'portrait';
  // Never use the tall "big" button size: on short landscape screens the extra
  // height (plus the score area) pushed the bottom button — and its label — off
  // screen. Standard-height buttons fit reliably in both orientations.
  const big = false;

  const teamName =
    team.name || (side === 'home' ? t('common.home') : t('common.away'));

  const statsBlock = showStats ? (
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
              fontSize: isPortrait ? 18 : 22,
              fontWeight: '700',
              marginTop: 2,
            }}
          >
            {line.value}
          </Text>
        </View>
      ))}
    </View>
  ) : null;

  const renderAction = (action: SportAction) => (
    <ActionButton
      key={action.id}
      action={action}
      onPress={() => onAction(side, action.id)}
      baseColor={teamColor}
      big={big}
      fill={isPortrait}
    />
  );

  const portraitRows: SportAction[][] = [];
  for (let i = 0; i < actions.length; i += PORTRAIT_COLUMNS) {
    portraitRows.push(actions.slice(i, i + PORTRAIT_COLUMNS));
  }

  const actionRow = isPortrait ? (
    <View style={styles.portraitGrid}>
      {portraitRows.map((row, i) => (
        <View key={i} style={styles.portraitRow}>
          {row.map(renderAction)}
        </View>
      ))}
    </View>
  ) : (
    <View style={styles.actionsRow}>{actions.map(renderAction)}</View>
  );

  if (isPortrait) {
    return (
      <View
        style={[
          styles.container,
          styles.containerPortrait,
          { backgroundColor: theme.colors.bgElevated },
        ]}
      >
        {/* Compact header: color dot + name (left) + score (right). */}
        <View style={styles.portraitHeader}>
          <View style={[styles.colorDot, { backgroundColor: teamColor }]} />
          <Text
            numberOfLines={1}
            allowFontScaling={false}
            style={{
              color: theme.colors.text,
              fontSize: 18,
              fontWeight: '700',
              flex: 1,
            }}
          >
            {teamName}
          </Text>
          <BigScore
            key={`${side}-${score}`}
            value={score}
            color={teamColor}
            style={styles.portraitScore}
          />
        </View>

        {statsBlock}
        {actionRow}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bgElevated }]}>
      {/* Team name (away side mirrors home: dot on the right, text right-aligned) */}
      <View
        style={[
          styles.nameRow,
          // Both top corners carry a floating control in landscape (score.tsx):
          // back on the left, rotate on the right. Reserve the corner on each
          // side so a long team name never slides beneath one.
          isAway
            ? { flexDirection: 'row-reverse', paddingRight: 44 }
            : { paddingLeft: 44 },
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
          {teamName}
        </Text>
      </View>

      {/* Big score */}
      <View style={styles.scoreArea}>
        <BigScore key={`${side}-${score}`} value={score} color={teamColor} />
      </View>

      {statsBlock}
      {actionRow}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
    gap: 8,
  },
  containerPortrait: {
    // Grow into the screen's free space (sharing it with the timeline between
    // the two panels) so the buttons get big, but never shrink below content.
    flex: 0,
    flexGrow: 1,
    flexShrink: 0,
    borderRadius: 16,
  },
  portraitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  portraitScore: {
    fontSize: 44,
    lineHeight: 48,
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
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
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
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  portraitGrid: {
    flexGrow: 1,
    gap: 8,
  },
  portraitRow: {
    flexGrow: 1,
    flexBasis: PORTRAIT_ROW_BASE,
    flexDirection: 'row',
    gap: 8,
  },
});

export default TeamPanel;
