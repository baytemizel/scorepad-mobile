import React from 'react';
import { Pressable, Text, View, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme/ThemeProvider';
import { shade } from '@/theme/tokens';
import { haptic, playScoreSound } from '@/services/feedback';
import { SportAction } from '@/sports';
import { useTranslation } from 'react-i18next';

interface ActionButtonProps {
  action: SportAction;
  onPress: () => void;
  baseColor: string;
  style?: StyleProp<ViewStyle>;
  big?: boolean;
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
}: ActionButtonProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  const handlePress = () => {
    haptic('medium');
    void playScoreSound();
    onPress();
  };

  const gradient: [string, string] = (() => {
    switch (action.variant) {
      case 'primary':
        return [baseColor, shade(baseColor, 0.22)];
      case 'warning':
        return [theme.colors.warning, shade(theme.colors.warning, 0.22)];
      case 'danger':
        return [theme.colors.danger, shade(theme.colors.danger, 0.22)];
      default:
        return [theme.colors.surface, theme.colors.surfaceAlt];
    }
  })();

  const isSecondary = action.variant === 'secondary';
  const fg = isSecondary ? theme.colors.text : theme.colors.textInverse;

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        {
          flex: 1,
          minHeight: big ? 88 : 64,
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
          paddingVertical: theme.spacing.sm,
          borderWidth: isSecondary ? 1 : 0,
          borderColor: theme.colors.border,
          backgroundColor: isSecondary ? theme.colors.surface : undefined,
        }}
      >
        <View style={{ alignItems: 'center', gap: 2 }}>
          <Text
            allowFontScaling={false}
            style={{
              color: fg,
              fontSize: big ? 40 : 28,
              fontWeight: '900',
              letterSpacing: -1,
            }}
          >
            {action.short}
          </Text>
          <Text
            allowFontScaling={false}
            numberOfLines={1}
            style={{
              color: fg,
              fontSize: big ? 14 : 12,
              fontWeight: '600',
              opacity: 0.9,
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
