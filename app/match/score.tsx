import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  BackHandler,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { TeamPanel } from '@/components/scoring/TeamPanel';
import { ScoreCenterBar } from '@/components/scoring/ScoreCenterBar';
import { PortraitControlBar } from '@/components/scoring/PortraitControlBar';
import { LiveMatchTimeline } from '@/components/scoring/LiveMatchTimeline';
import { RotateHint } from '@/components/scoring/RotateHint';
import { MatchSummaryModal } from '@/components/scoring/MatchSummaryModal';
import { useScoreOrientation } from '@/hooks/useScoreOrientation';
import { useMatchStore } from '@/store/matchStore';
import { useMatchHistoryStore } from '@/store/matchHistoryStore';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { syncMatchToCloud } from '@/services/firestore';
import { interstitial } from '@/services/ads';
import { haptic, playWhistle } from '@/services/feedback';
import { logEvent } from '@/services/analytics';
import { getEngine, matchHeadlineScore } from '@/sports';
import { MatchState, TeamSide } from '@/types';

export default function ScoreScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { isLandscape, rotate } = useScoreOrientation();
  const state = useMatchStore((s) => s.active);
  const applyAction = useMatchStore((s) => s.applyAction);
  const undo = useMatchStore((s) => s.undo);
  const finish = useMatchStore((s) => s.finish);
  const nextPeriod = useMatchStore((s) => s.nextPeriod);
  const reset = useMatchStore((s) => s.reset);
  const saveMatch = useMatchHistoryStore((s) => s.saveMatch);
  const isPremium = useAuthStore((s) => s.isPremium);
  const user = useAuthStore((s) => s.user);
  const rotateHintSeen = useSettingsStore((s) => s.scoreRotateHintSeen);
  const setRotateHintSeen = useSettingsStore((s) => s.setScoreRotateHintSeen);

  const [matchEndedShown, setMatchEndedShown] = useState(false);
  const [saved, setSaved] = useState(false);
  const interstitialShownRef = useRef(false);

  useEffect(() => {
    interstitial.load();
  }, []);

  // Rotating to landscape counts as "the user discovered rotation" — retire the
  // one-time hint for good.
  useEffect(() => {
    if (isLandscape && !rotateHintSeen) {
      setRotateHintSeen(true);
    }
  }, [isLandscape, rotateHintSeen, setRotateHintSeen]);

  // Side effects when the match transitions to finished: whistle, haptic,
  // analytics, auto-save (signed-in users), interstitial (non-premium).
  // Guarded by matchEndedShown so they fire exactly once per finished state.
  useEffect(() => {
    if (state?.finished && !matchEndedShown) {
      setMatchEndedShown(true);
      void playWhistle();
      haptic('success');
      void logEvent('match_finished', {
        sport: state.config.sport,
        winner: state.winner ?? 'draw',
      });

      // Signed-in (free or premium): persist locally + sync to cloud.
      // Guests (no user) never persist match data.
      if (user && !saved) {
        const record = saveMatch(state);
        if (record) {
          void syncMatchToCloud(record);
          setSaved(true);
        }
      }

      // Non-premium (guest or free): show an interstitial after the user has
      // had a beat with the score.
      if (!isPremium && !interstitialShownRef.current) {
        interstitialShownRef.current = true;
        setTimeout(() => {
          interstitial.show();
        }, 1500);
      }
    }
    // New match started: reset the one-shot guards.
    if (state && !state.finished && matchEndedShown) {
      setMatchEndedShown(false);
      setSaved(false);
    }
  }, [state, matchEndedShown, isPremium, user, saved, saveMatch]);

  // Drop the match and go home. Nothing is persisted here: a finished match was
  // already saved by the effect above, and an abandoned one is meant to be lost.
  const onNewMatch = useCallback(() => {
    reset();
    setMatchEndedShown(false);
    setSaved(false);
    interstitialShownRef.current = false;
    router.replace('/(main)');
  }, [reset]);

  // The screen's way out, shared by the back control and the Android back
  // button. A live match asks first — leaving throws the score away, which is
  // not what someone swiping back from the scoreboard usually means.
  const onBack = useCallback(() => {
    if (!state || state.finished) {
      onNewMatch();
      return;
    }
    Alert.alert(t('score.leaveMatch'), t('score.leaveMatchBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('score.leave'), style: 'destructive', onPress: onNewMatch },
    ]);
  }, [state, onNewMatch, t]);

  // Android's back button / back gesture would otherwise pop the screen and
  // silently bin a running match — and, with nothing handling it, slide the
  // screen away under the predictive-back animation. Route it through onBack
  // and always swallow it.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);

  if (!state) {
    // No active match — bounce back to home.
    return (
      <View style={[styles.fill, { backgroundColor: theme.colors.bg }]}>
        <Text style={{ color: theme.colors.text }}>No match in progress.</Text>
      </View>
    );
  }

  const onAction = (side: TeamSide, actionId: string) => {
    applyAction(side, actionId);
  };

  const onUndo = () => {
    undo();
  };

  const onFinishConfirm = () => {
    Alert.alert(t('score.endMatch'), t('score.endMatchBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('score.finish'),
        style: 'destructive',
        onPress: () => {
          finish();
        },
      },
    ]);
  };

  const onShare = async () => {
    const home = state.config.home.name || t('common.home');
    const away = state.config.away.name || t('common.away');
    const { home: homeScore, away: awayScore } = matchHeadlineScore(state);
    const winner =
      state.winner === 'home' ? home : state.winner === 'away' ? away : null;
    const message = winner
      ? `${home} ${homeScore} – ${awayScore} ${away}\n🏆 ${t('score.winner', { name: winner })}\n— ScorePad`
      : `${home} ${homeScore} – ${awayScore} ${away}\n${t('score.draw')}\n— ScorePad`;
    try {
      await Share.share({ message });
      void logEvent('match_share', { sport: state.config.sport });
    } catch {
      // ignore
    }
  };

  const onExit = () => {
    if (state.finished) {
      onNewMatch();
    } else {
      onFinishConfirm();
    }
  };

  const showHint = !rotateHintSeen && !isLandscape && !state.finished;

  return (
    <SafeAreaView
      style={[styles.fill, { backgroundColor: theme.colors.bg }]}
      // Portrait hands the bottom edge to PortraitControlBar, which pads itself
      // past the navigation bar / home indicator. Padding it here instead would
      // leave the row flush against the bar on gesture-nav devices.
      edges={
        isLandscape
          ? ['top', 'bottom', 'left', 'right']
          : ['top', 'left', 'right']
      }
    >
      {isLandscape ? (
        <View style={styles.row}>
          <TeamPanel state={state} side="home" onAction={onAction} />
          <ScoreCenterBar
            state={state}
            onUndo={onUndo}
            onFinish={onExit}
            onNextPeriod={nextPeriod}
          />
          <TeamPanel state={state} side="away" onAction={onAction} />
          <CircleButton
            icon="chevron-left"
            onPress={onBack}
            accessibilityLabel={t('common.back')}
            floating="left"
          />
          <CircleButton
            icon="screen-rotation"
            onPress={rotate}
            accessibilityLabel={t('score.rotateHint')}
            floating="right"
          />
        </View>
      ) : (
        <View style={styles.portrait}>
          <PortraitTopBar state={state} onBack={onBack} onRotate={rotate} />
          <TeamPanel
            state={state}
            side="home"
            onAction={onAction}
            orientation="portrait"
          />
          <View style={styles.timelineWrap}>
            <LiveMatchTimeline state={state} />
          </View>
          <TeamPanel
            state={state}
            side="away"
            onAction={onAction}
            orientation="portrait"
          />
          <PortraitControlBar
            state={state}
            onUndo={onUndo}
            onFinish={onExit}
            onNextPeriod={nextPeriod}
          />
          <RotateHint visible={showHint} onDismiss={() => setRotateHintSeen(true)} />
        </View>
      )}

      <MatchSummaryModal
        visible={state.finished}
        state={state}
        onBack={onNewMatch}
        onShare={onShare}
      />
    </SafeAreaView>
  );
}

/**
 * Round icon control. `floating` pins it to a top corner, which is how the
 * landscape layout places it — there is no header there to hold it.
 */
function CircleButton({
  icon,
  onPress,
  accessibilityLabel,
  floating,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  onPress: () => void;
  accessibilityLabel: string;
  floating?: 'left' | 'right';
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.circleBtn,
        floating === 'left' && styles.fabLeft,
        floating === 'right' && styles.fabRight,
        {
          backgroundColor: theme.colors.surfaceAlt,
          borderColor: theme.colors.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <MaterialCommunityIcons name={icon} size={20} color={theme.colors.text} />
    </Pressable>
  );
}

/** Portrait header: back (left) + live status label + rotate control (right). */
function PortraitTopBar({
  state,
  onBack,
  onRotate,
}: {
  state: MatchState;
  onBack: () => void;
  onRotate: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const engine = getEngine(state.config.sport);
  const status = engine.getStatusLabel(state);
  const statusText = t(status.key, status.values).toUpperCase();

  return (
    <View style={styles.topBar}>
      <CircleButton
        icon="chevron-left"
        onPress={onBack}
        accessibilityLabel={t('common.back')}
      />
      <Text
        numberOfLines={1}
        allowFontScaling={false}
        style={{
          flex: 1,
          color: theme.colors.textMuted,
          fontSize: 12,
          fontWeight: '800',
          letterSpacing: 1,
        }}
      >
        {statusText}
      </Text>
      <CircleButton
        icon="screen-rotation"
        onPress={onRotate}
        accessibilityLabel={t('score.rotateHint')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  row: { flex: 1, flexDirection: 'row' },
  portrait: { flex: 1, paddingHorizontal: 12, paddingTop: 4, gap: 10 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timelineWrap: {
    flex: 1,
    minHeight: 60,
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  fabLeft: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 20,
  },
  fabRight: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 20,
  },
});
