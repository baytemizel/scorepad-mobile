import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
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
import { sportEngines, getEngine } from '@/sports';
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
    const eng = sportEngines[state.config.sport];
    const home = state.config.home.name || t('common.home');
    const away = state.config.away.name || t('common.away');
    const homeScore = eng.getDisplayScore(state, 'home');
    const awayScore = eng.getDisplayScore(state, 'away');
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

  const onNewMatch = () => {
    reset();
    setMatchEndedShown(false);
    setSaved(false);
    interstitialShownRef.current = false;
    router.replace('/(main)');
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
      edges={['top', 'bottom', 'left', 'right']}
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
          <RotateButton onPress={rotate} floating />
        </View>
      ) : (
        <View style={styles.portrait}>
          <PortraitTopBar state={state} onRotate={rotate} />
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

/** Rotate control. `floating` pins it to the top-right corner (landscape). */
function RotateButton({
  onPress,
  floating,
}: {
  onPress: () => void;
  floating?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.rotateBtn,
        floating && styles.rotateFab,
        {
          backgroundColor: theme.colors.surfaceAlt,
          borderColor: theme.colors.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <MaterialCommunityIcons name="screen-rotation" size={20} color={theme.colors.text} />
    </Pressable>
  );
}

/** Portrait header: live status label (left) + rotate control (right). */
function PortraitTopBar({
  state,
  onRotate,
}: {
  state: MatchState;
  onRotate: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const engine = getEngine(state.config.sport);
  const status = engine.getStatusLabel(state);
  const statusText = t(status.key, status.values).toUpperCase();

  return (
    <View style={styles.topBar}>
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
      <RotateButton onPress={onRotate} />
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
  rotateBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  rotateFab: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 20,
  },
});
