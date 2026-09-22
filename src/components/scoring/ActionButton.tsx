import React, { useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  StyleProp,
  ViewStyle,
} from 'react-native';
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
  /**
   * Portrait layout: the parent row sets the height (it grows into the screen's
   * free space), and the symbol + label are sized to whatever height that is,
   * instead of the fixed landscape metrics.
   */
  fill?: boolean;
}

/** Height a `fill` button is laid out for until it has measured itself. */
const FILL_BASE_HEIGHT = 46;

/**
 * Text sizes for a `fill` button of the given height: a fixed share of the
 * height, kept a notch below the landscape sizes (28 / 12) so a tall portrait
 * button reads as roomy rather than shouty.
 *
 * Always fits: Poppins sets about 1.5x its font size per line, and
 * 1.5 * (0.3h + 0.145h) + 8pt of padding stays under h for any h >= 46.
 */
function fillTextSizes(height: number): { symbol: number; label: number } {
  const h = Math.max(height, FILL_BASE_HEIGHT);
  const symbol = Math.min(26, Math.max(14, Math.round(h * 0.3)));
  const label = Math.min(12, Math.max(10, Math.round(h * 0.145)));
  return { symbol, label };
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
  fill,
}: ActionButtonProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [fillHeight, setFillHeight] = useState(0);
  const onLayout = fill
    ? (e: LayoutChangeEvent) => setFillHeight(Math.round(e.nativeEvent.layout.height))
    : undefined;
  const fillSizes = fill ? fillTextSizes(fillHeight) : null;

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
      onLayout={onLayout}
      style={({ pressed }) => [
        {
          flex: 1,
          // A `fill` button takes its height from the row it is stretched in.
          minHeight: fill ? undefined : big ? 88 : 64,
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
          // Same radius as the clipping parent, so the fill's own rounded
          // corners (anti-aliased) line up with the clip.
          borderRadius: theme.radii.lg,
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: fill ? theme.spacing.xs : theme.spacing.sm,
        }}
      >
        <View style={{ alignSelf: 'stretch', alignItems: 'center', gap: fill ? 0 : 2 }}>
          <Text
            allowFontScaling={false}
            adjustsFontSizeToFit
            numberOfLines={1}
            style={{
              color: fg,
              fontSize: fillSizes ? fillSizes.symbol : big ? 40 : 28,
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
              fontSize: fillSizes ? fillSizes.label : big ? 14 : 12,
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
      {isSecondary && (
        // The outline is its own layer on top of the fill, never the
        // gradient's border. On Android expo-linear-gradient draws the border
        // on a wrapper view and paints the fill as a separate view *inside* it,
        // yet rounds that inner view with the full outer radius — so at every
        // corner a light crescent opened up between outline and fill, and the
        // edge looked broken (free throw, corner, 2-min: all `secondary`).
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: theme.radii.lg,
              borderWidth: 1,
              borderColor: tint(baseColor, 0.4),
            },
          ]}
        />
      )}
    </Pressable>
  );
}

export default ActionButton;
