import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from 'react-i18next';

interface RotateHintProps {
  visible: boolean;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 6000;

/**
 * One-time centered overlay that tells the user the score screen can rotate to
 * landscape. Shown only while it's `visible` (caller gates on the persisted
 * "seen" flag + portrait + not finished). Dismisses on tap or after a timeout;
 * the caller also dismisses it when the user actually rotates.
 *
 * pointerEvents="box-none" so it never blocks the scoring controls underneath —
 * only the hint card itself is tappable.
 */
export function RotateHint({ visible, onDismiss }: RotateHintProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const wiggle = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    wiggle.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700 }),
        withTiming(0, { duration: 700 }),
      ),
      -1,
      false,
    );
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => {
      cancelAnimation(wiggle);
      clearTimeout(timer);
    };
  }, [visible, onDismiss, wiggle]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${wiggle.value * 90}deg` },
      { scale: 1 + wiggle.value * 0.08 },
    ],
  }));

  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Pressable
        onPress={onDismiss}
        style={[
          styles.card,
          { backgroundColor: theme.colors.overlay, borderColor: theme.colors.border },
        ]}
      >
        <Animated.View style={iconStyle}>
          <MaterialCommunityIcons
            name="phone-rotate-landscape"
            size={56}
            color="#FFFFFF"
          />
        </Animated.View>
        <Text style={styles.caption} allowFontScaling={false}>
          {t('score.rotateHint')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  card: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 24,
    paddingHorizontal: 28,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 280,
  },
  caption: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default RotateHint;
