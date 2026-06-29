import React from 'react';
import { Pressable, Text, View, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme/ThemeProvider';
import { shade, tint } from '@/theme/tokens';
import { haptic, playScoreSound } from '@/services/feedback';
import { SportAction } from '@/sports';
import { useTranslation } from 'react-i18next';

interface ActionButtonProps {
  action: SportAction;
  onPress: () => void;
  baseColor: string;
  style?: StyleProp<ViewStyle>;
  big?: boolean;
  /** Tighter sizing for the portrait layout (smaller height, symbol, padding). */
  compact?: boolean;
}

/**
 * Big colorful tap target for scoring. Uses gradient for primary actions to
 * stand out under bright outdoor light.
 */
export function ActionButton({
  action,
  onPress,
  baseColor,
  style,
  big,
  compact,
}: ActionButtonProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  const handlePress = () => {
    haptic('medium');
    void playScoreSound();
    onPress();
  };

  const isSecondary = action.variant === 'secondary';
  // Secondary actions are recolored to a light tint of the team color (never
  // white) so they read as "this team, lower emphasis" while primary stays the
  // full-strength gradient. Dark mode tints less toward white so the swatch
  // keeps its hue against the dark background.
  const secondaryTop = tint(baseColor, theme.mode === 'dark' ? 0.6 : 0.8);
  const secondaryBottom = tint(baseColor, theme.mode === 'dark' ? 0.46 : 0.64);

  const gradient: [string, string] = (() => {
    switch (action.variant) {
      case 'primary':
        return [baseColor, shade(baseColor, 0.22)];
      case 'warning':
        return [theme.colors.warning, shade(theme.colors.warning, 0.22)];
      case 'danger':
        return [theme.colors.danger, shade(theme.colors.danger, 0.22)];
      default:
        return [secondaryTop, secondaryBottom];
    }
  })();

  // Dark team-hued text on the light tint keeps contrast without going white.
  const fg = isSecondary ? shade(baseColor, 0.5) : theme.colors.textInverse;

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        {
          flex: 1,
          minHeight: compact ? 46 : big ? 88 : 64,
          borderRadius: theme.radii.lg,
          overflow: 'hidden',
          transform: [{ scale: pressed ? 0.97 : 1 }],
          opacity: pressed ? 0.9 : 1,
        },
        style,
      ]}
      hitSlop={4}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: theme.spacing.md,
          paddingVertical: compact ? theme.spacing.xs : theme.spacing.sm,
          borderWidth: isSecondary ? 1 : 0,
          borderColor: isSecondary ? tint(baseColor, 0.4) : undefined,
        }}
      >
        <View style={{ alignSelf: 'stretch', alignItems: 'center', gap: compact ? 0 : 2 }}>
          <Text
            allowFontScaling={false}
            adjustsFontSizeToFit
            numberOfLines={1}
            style={{
              color: fg,
              fontSize: compact ? 20 : big ? 40 : 28,
              fontWeight: '900',
              letterSpacing: -1,
            }}
          >
            {action.short}
          </Text>
          <Text
            allowFontScaling={false}
            adjustsFontSizeToFit
            numberOfLines={1}
            minimumFontScale={0.5}
            style={{
              color: fg,
              fontSize: compact ? 10 : big ? 14 : 12,
              fontWeight: '600',
              opacity: 0.9,
              alignSelf: 'stretch',
              textAlign: 'center',
            }}
          >
            {t(action.labelKey)}
          </Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

export default ActionButton;
