import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme/ThemeProvider';
import { shade } from '@/theme/tokens';
import { useTranslation } from 'react-i18next';
import { MatchState } from '@/types';
import { getEngine, statsFitCenter } from '@/sports';
import { haptic } from '@/services/feedback';

interface ScoreCenterBarProps {
  state: MatchState;
  onUndo: () => void;
  onFinish: () => void;
  onNextPeriod: () => void;
}

/**
 * Vertical center bar between the two team panels on the landscape score
 * screen. Shows status (period/set/etc.) and exposes Undo + Finish.
 */
export function ScoreCenterBar({ state, onUndo, onFinish, onNextPeriod }: ScoreCenterBarProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const engine = getEngine(state.config.sport);
  const status = engine.getStatusLabel(state);
  const canUndo = state.events.length > 0 && !state.finished;
  // The "Next" button advances to the next period/set. It shows in every sport
  // until the last unit (then the user taps Finish). Period-based sports use
  // the configured period count; set-based engines report their max set count.
  const totalPeriods = engine.periodCount?.(state) ?? state.config.periodCount ?? 1;
  const showNextPeriod = !state.finished && state.currentPeriod + 1 < totalPeriods;

  // Split the localized status into a small label line + a value line, e.g.
  // "PERİYOT 1 / 4" -> "PERİYOT" + "1 / 4".
  const statusText = t(status.key, status.values).toUpperCase();
  const statusMatch = statusText.match(/^(\D*?)\s*(\d.*)$/);
  const statusLabel = statusMatch?.[1]?.trim() || statusText;
  const statusValue = statusMatch?.[2]?.trim() ?? '';

  // Single-stat sports (e.g. basketball fouls) render the stat here as home–away.
  const showCenterStat = statsFitCenter(engine, state);
  const homeStat = showCenterStat ? (engine.getStatLines?.(state, 'home') ?? [])[0] ?? null : null;
  const awayStat = showCenterStat ? (engine.getStatLines?.(state, 'away') ?? [])[0] ?? null : null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.bg,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <Text
        numberOfLines={2}
        allowFontScaling={false}
        style={{
          color: theme.colors.textMuted,
          fontSize: 9,
          fontWeight: '700',
          textAlign: 'center',
          letterSpacing: 1,
        }}
      >
        {statusLabel}
      </Text>
      {statusValue ? (
        <Text
          numberOfLines={1}
          allowFontScaling={false}
          style={{
            color: theme.colors.text,
            fontSize: 14,
            fontWeight: '800',
            textAlign: 'center',
            marginTop: 1,
          }}
        >
          {statusValue}
        </Text>
      ) : null}

      {homeStat && awayStat && (
        <View style={{ alignItems: 'center', marginTop: 10 }}>
          <Text
            numberOfLines={1}
            allowFontScaling={false}
            style={{
              color: theme.colors.textMuted,
              fontSize: 9,
              fontWeight: '700',
              letterSpacing: 1,
            }}
          >
            {t(homeStat.labelKey).toUpperCase()}
          </Text>
          <Text
            numberOfLines={1}
            allowFontScaling={false}
            style={{
              color: theme.colors.text,
              fontSize: 16,
              fontWeight: '800',
              marginTop: 1,
            }}
          >
            {homeStat.value} - {awayStat.value}
          </Text>
        </View>
      )}

      <View style={{ flex: 1 }} />

      {showNextPeriod && (
        <Pressable
          onPress={() => {
            haptic('light');
            onNextPeriod();
          }}
          style={({ pressed }) => [
            styles.iconButton,
            {
              backgroundColor: theme.colors.surface,
              opacity: pressed ? 0.7 : 1,
              borderColor: theme.colors.border,
              marginBottom: 8,
            },
          ]}
        >
          <Text style={{ fontSize: 18 }}>⏭</Text>
          <Text
            allowFontScaling={false}
            style={{
              color: theme.colors.text,
              fontSize: 10,
              fontWeight: '700',
            }}
          >
            {t('score.nextPeriod').toUpperCase()}
          </Text>
        </Pressable>
      )}

      <Pressable
        disabled={!canUndo}
        onPress={() => {
          haptic('light');
          onUndo();
        }}
        style={({ pressed }) => [
          styles.iconButton,
          {
            backgroundColor: theme.colors.surface,
            opacity: !canUndo ? 0.3 : pressed ? 0.7 : 1,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Text style={{ fontSize: 18 }}>↶</Text>
        <Text
          allowFontScaling={false}
          style={{
            color: theme.colors.text,
            fontSize: 10,
            fontWeight: '700',
          }}
        >
          {t('score.undo').toUpperCase()}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => {
          haptic('warning');
          onFinish();
        }}
        style={({ pressed }) => [styles.finishButton, { opacity: pressed ? 0.85 : 1 }]}
      >
        <LinearGradient
          colors={[theme.colors.danger, shade(theme.colors.danger, 0.25)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.finishGradient}
        >
          <Text style={{ fontSize: 18 }}>⏹</Text>
          <Text
            allowFontScaling={false}
            style={{
              color: theme.colors.textInverse,
              fontSize: 10,
              fontWeight: '700',
            }}
          >
            {t('score.finish').toUpperCase()}
          </Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 90,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  iconButton: {
    width: 70,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  finishButton: {
    width: 70,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  finishGradient: {
    paddingVertical: 8,
    alignItems: 'center',
    gap: 2,
  },
});

export default ScoreCenterBar;
