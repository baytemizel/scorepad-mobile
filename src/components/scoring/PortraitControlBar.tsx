import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme/ThemeProvider';
import { shade } from '@/theme/tokens';
import { useTranslation } from 'react-i18next';
import { MatchState } from '@/types';
import { getEngine, statsFitCenter } from '@/sports';
import { haptic } from '@/services/feedback';

interface PortraitControlBarProps {
  state: MatchState;
  onUndo: () => void;
  onFinish: () => void;
  onNextPeriod: () => void;
}

/**
 * Horizontal control row for the PORTRAIT score screen — the portrait
 * counterpart of the landscape ScoreCenterBar. Exposes the optional single
 * "home – away" center stat plus Undo / Next / Finish. No white buttons:
 * Undo uses a neutral surface tone, Next a light primary tint, Finish its
 * semantic danger gradient.
 */
export function PortraitControlBar({
  state,
  onUndo,
  onFinish,
  onNextPeriod,
}: PortraitControlBarProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const engine = getEngine(state.config.sport);

  const canUndo = state.events.length > 0 && !state.finished;
  const totalPeriods = engine.periodCount?.(state) ?? state.config.periodCount ?? 1;
  const showNextPeriod = !state.finished && state.currentPeriod + 1 < totalPeriods;

  const showCenterStat = statsFitCenter(engine, state);
  const homeStat = showCenterStat ? (engine.getStatLines?.(state, 'home') ?? [])[0] ?? null : null;
  const awayStat = showCenterStat ? (engine.getStatLines?.(state, 'away') ?? [])[0] ?? null : null;

  return (
    <View style={styles.container}>
      {homeStat && awayStat && (
        <View style={styles.stat}>
          <Text
            numberOfLines={1}
            allowFontScaling={false}
            style={{ color: theme.colors.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 1 }}
          >
            {t(homeStat.labelKey).toUpperCase()}
          </Text>
          <Text
            numberOfLines={1}
            allowFontScaling={false}
            style={{ color: theme.colors.text, fontSize: 16, fontWeight: '800' }}
          >
            {homeStat.value} - {awayStat.value}
          </Text>
        </View>
      )}

      <Pressable
        disabled={!canUndo}
        onPress={() => {
          haptic('light');
          onUndo();
        }}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: theme.colors.surfaceAlt,
            borderColor: theme.colors.border,
            opacity: !canUndo ? 0.3 : pressed ? 0.7 : 1,
          },
        ]}
      >
        <Text style={{ fontSize: 18 }}>↶</Text>
        <Text
          allowFontScaling={false}
          adjustsFontSizeToFit
          numberOfLines={1}
          style={{ color: theme.colors.text, fontSize: 11, fontWeight: '700' }}
        >
          {t('score.undo').toUpperCase()}
        </Text>
      </Pressable>

      {showNextPeriod && (
        <Pressable
          onPress={() => {
            haptic('light');
            onNextPeriod();
          }}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: theme.colors.primary,
              borderColor: theme.colors.primary,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Text style={{ fontSize: 18 }}>⏭</Text>
          <Text
            allowFontScaling={false}
            adjustsFontSizeToFit
            numberOfLines={1}
            style={{ color: theme.colors.textInverse, fontSize: 11, fontWeight: '800' }}
          >
            {t('score.nextPeriod').toUpperCase()}
          </Text>
        </Pressable>
      )}

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
            adjustsFontSizeToFit
            numberOfLines={1}
            style={{ color: theme.colors.textInverse, fontSize: 11, fontWeight: '800' }}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  stat: {
    alignItems: 'center',
    paddingRight: 4,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  finishButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  finishGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
  },
});

export default PortraitControlBar;
