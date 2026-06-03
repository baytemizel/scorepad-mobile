import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Pressable,
  Share,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { TeamPanel } from '@/components/scoring/TeamPanel';
import { ScoreCenterBar } from '@/components/scoring/ScoreCenterBar';
import { Button } from '@/components/ui/Button';
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

  // Show end-of-match overlay when finished + side effects.
  useEffect(() => {
    if (state?.finished && !matchEndedShown) {
      setMatchEndedShown(true);
      void playWhistle();
      haptic('success');
      void logEvent('match_finished', {
        sport: state.config.sport,
        winner: state.winner ?? 'draw',
      });

      // Wait a beat so the user sees the final score before the interstitial.
      if (!isPremium && !interstitialShownRef.current) {
        interstitialShownRef.current = true;
        setTimeout(() => {
          interstitial.show();
        }, 1500);
      }
    }
  }, [state, matchEndedShown, isPremium]);

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

  const onSave = async () => {
    if (!isPremium) {
      router.push('/(main)/premium');
      return;
    }
    if (!state || !state.finished) return;
    const record = saveMatch(state);
    if (record) {
      void syncMatchToCloud(record);
      setSaved(true);
      haptic('success');
    }
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

      <Pressable
        onPress={onExit}
        hitSlop={10}
        accessibilityLabel={t('common.back')}
        style={[
          styles.backBtn,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Text style={{ color: theme.colors.text, fontSize: 22, lineHeight: 24 }}>‹</Text>
      </Pressable>

      <Modal
        visible={state.finished && matchEndedShown}
        transparent
        animationType="fade"
        supportedOrientations={['landscape', 'landscape-left', 'landscape-right']}
      >
        {(() => {
          const winnerSide =
            state.winner === 'home' || state.winner === 'away'
              ? state.winner
              : null;
          const endCard = (
            <Animated.View
              entering={FadeInDown.duration(450)}
              style={[
                styles.endCard,
                {
                  backgroundColor: theme.colors.bgElevated,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <LinearGradient
                colors={theme.gradients.premium}
                style={styles.trophyCircle}
              >
                <Text style={{ fontSize: 36 }}>🏆</Text>
              </LinearGradient>

              <Text style={[styles.endTitle, { color: theme.colors.text }]}>
                {t('score.matchEnded')}
              </Text>
              <Text style={[styles.endWinner, { color: theme.colors.text }]}>
                {winnerSide === null
                  ? t('score.draw')
                  : t('score.winner', {
                      name:
                        winnerSide === 'home'
                          ? state.config.home.name || t('common.home')
                          : state.config.away.name || t('common.away'),
                    })}
              </Text>

              <Text style={[styles.endScore, { color: theme.colors.text }]}>
                {sportEngines[state.config.sport].getDisplayScore(state, 'home')} –{' '}
                {sportEngines[state.config.sport].getDisplayScore(state, 'away')}
              </Text>

              {saved && (
                <Text
                  style={{
                    color: theme.colors.success,
                    marginTop: 6,
                    fontWeight: '700',
                  }}
                >
                  ✓ {t('score.saved')}
                </Text>
              )}

              <View style={styles.endActions}>
                {!saved &&
                  (isPremium ? (
                    <Button
                      label={t('common.save')}
                      variant="primary"
                      size="md"
                      onPress={onSave}
                      style={{ flex: 1 }}
                    />
                  ) : (
                    <Button
                      label={t('score.savePromptPremium')}
                      variant="gradient"
                      gradientColors={theme.gradients.premium}
                      size="md"
                      onPress={onSave}
                      style={{ flex: 1 }}
                    />
                  ))}
                <Button
                  label={t('score.share')}
                  variant="secondary"
                  size="md"
                  onPress={onShare}
                  style={{ flex: 1 }}
                />
              </View>

              <Pressable onPress={onNewMatch} style={{ marginTop: 14 }}>
                <Text
                  style={{
                    color: theme.colors.primary,
                    fontWeight: '700',
                    fontSize: 16,
                  }}
                >
                  {t('score.newMatch')}
                </Text>
              </Pressable>
            </Animated.View>
          );

          return (
            <View style={styles.overlay}>
              <Animated.View
                entering={FadeIn.duration(300)}
                style={[styles.dim, { backgroundColor: '#000000CC' }]}
              />
              {/* Back button — must live inside the Modal so its native
                  layer doesn't swallow the touch (the outer backBtn is
                  hidden while finished for the same reason). */}
              <Pressable
                onPress={onNewMatch}
                hitSlop={10}
                accessibilityLabel={t('common.back')}
                style={[
                  styles.backBtn,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text style={{ color: theme.colors.text, fontSize: 22, lineHeight: 24 }}>‹</Text>
              </Pressable>
              {winnerSide === null ? (
                <View style={styles.overlayCenter}>{endCard}</View>
              ) : (
                <View style={styles.overlayRow} pointerEvents="box-none">
                  <View style={styles.overlayHalf} pointerEvents="box-none">
                    {winnerSide === 'home' && endCard}
                  </View>
                  <View style={styles.overlayCenterGap} pointerEvents="none" />
                  <View style={styles.overlayHalf} pointerEvents="box-none">
                    {winnerSide === 'away' && endCard}
                  </View>
                </View>
              )}
            </View>
          );
        })()}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  row: { flex: 1, flexDirection: 'row' },
  backBtn: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    zIndex: 10,
  },
  overlay: { flex: 1 },
  overlayCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  overlayRow: { flex: 1, flexDirection: 'row' },
  overlayHalf: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  overlayCenterGap: { width: 90 },
  dim: { ...StyleSheet.absoluteFillObject },
  endCard: {
    width: '92%',
    maxWidth: 420,
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
  },
  trophyCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  endTitle: { fontSize: 14, fontWeight: '700', letterSpacing: 1, opacity: 0.7 },
  endWinner: { fontSize: 26, fontWeight: '900', marginTop: 6, textAlign: 'center' },
  endScore: { fontSize: 56, fontWeight: '900', marginTop: 8, letterSpacing: -2 },
  endActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    width: '100%',
  },
});
