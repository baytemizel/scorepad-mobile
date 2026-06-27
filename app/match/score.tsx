import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { TeamPanel } from '@/components/scoring/TeamPanel';
import { ScoreCenterBar } from '@/components/scoring/ScoreCenterBar';
import { MatchSummaryModal } from '@/components/scoring/MatchSummaryModal';
import { useMatchStore } from '@/store/matchStore';
import { useMatchHistoryStore } from '@/store/matchHistoryStore';
import { useAuthStore } from '@/store/authStore';
import { syncMatchToCloud } from '@/services/firestore';
import { interstitial } from '@/services/ads';
import { haptic, playWhistle } from '@/services/feedback';
import { logEvent } from '@/services/analytics';
import { sportEngines } from '@/sports';
import { TeamSide } from '@/types';

export default function ScoreScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const state = useMatchStore((s) => s.active);
  const applyAction = useMatchStore((s) => s.applyAction);
  const undo = useMatchStore((s) => s.undo);
  const finish = useMatchStore((s) => s.finish);
  const nextPeriod = useMatchStore((s) => s.nextPeriod);
  const reset = useMatchStore((s) => s.reset);
  const saveMatch = useMatchHistoryStore((s) => s.saveMatch);
  const isPremium = useAuthStore((s) => s.isPremium);
  const user = useAuthStore((s) => s.user);

  const [matchEndedShown, setMatchEndedShown] = useState(false);
  const [saved, setSaved] = useState(false);
  const interstitialShownRef = useRef(false);

  // Lock landscape on mount, restore portrait on unmount.
  useEffect(() => {
    void ScreenOrientation.lockAsync(
      ScreenOrientation.OrientationLock.LANDSCAPE,
    );
    interstitial.load();
    return () => {
      void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

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

  return (
    <SafeAreaView
      style={[styles.fill, { backgroundColor: theme.colors.bg }]}
      edges={['top', 'bottom', 'left', 'right']}
    >
      <View style={styles.row}>
        <TeamPanel state={state} side="home" onAction={onAction} />
        <ScoreCenterBar
          state={state}
          onUndo={onUndo}
          onFinish={onExit}
          onNextPeriod={nextPeriod}
        />
        <TeamPanel state={state} side="away" onAction={onAction} />
      </View>

      <MatchSummaryModal
        visible={state.finished}
        state={state}
        onBack={onNewMatch}
        onShare={onShare}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  row: { flex: 1, flexDirection: 'row' },
});
