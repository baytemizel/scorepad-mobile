import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ViewStyle,
  StyleProp,
  ActivityIndicator,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme/ThemeProvider';
import { haptic } from '@/services/feedback';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gradient';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  gradientColors?: [string, string];
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  testID?: string;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<View, ButtonProps>(function Button(
  {
    label,
    onPress,
    variant = 'primary',
    size = 'md',
    loading,
    disabled,
    style,
    gradientColors,
    iconLeft,
    iconRight,
    testID,
    fullWidth,
  },
  ref,
) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const padV = size === 'lg' ? 16 : size === 'sm' ? 8 : 12;
  const padH = size === 'lg' ? 24 : size === 'sm' ? 12 : 16;
  const fontSize = size === 'lg' ? 18 : size === 'sm' ? 14 : 16;

  const handlePress = () => {
    if (isDisabled) return;
    haptic('light');
    onPress?.();
  };

  const baseStyle: ViewStyle = {
    paddingVertical: padV,
    paddingHorizontal: padH,
    borderRadius: theme.radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    width: fullWidth ? '100%' : undefined,
    opacity: isDisabled ? 0.5 : 1,
  };

  const colors: Record<Variant, { bg: string; fg: string }> = {
    primary: { bg: theme.colors.primary, fg: theme.colors.textInverse },
    secondary: { bg: theme.colors.surface, fg: theme.colors.text },
    ghost: { bg: 'transparent', fg: theme.colors.text },
    danger: { bg: theme.colors.danger, fg: theme.colors.textInverse },
    gradient: { bg: 'transparent', fg: theme.colors.textInverse },
  };

  const labelStyle = {
    color: colors[variant].fg,
    fontSize,
    fontWeight: '600' as const,
  };

  const renderInner = () => (
    <>
      {iconLeft}
      {loading ? (
        <ActivityIndicator color={colors[variant].fg} />
      ) : (
        <Text style={labelStyle}>{label}</Text>
      )}
      {iconRight}
    </>
  );

  if (variant === 'gradient') {
    const grad = gradientColors ?? theme.gradients.primary;
    return (
      <Pressable
        ref={ref}
        onPress={handlePress}
        disabled={isDisabled}
        style={[fullWidth && { width: '100%' }, style]}
        testID={testID}
      >
        <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={baseStyle}>
          {renderInner()}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      ref={ref}
      onPress={handlePress}
      disabled={isDisabled}
      testID={testID}
      style={[
        baseStyle,
        { backgroundColor: colors[variant].bg },
        variant === 'secondary' && { borderWidth: 1, borderColor: theme.colors.border },
        style,
      ]}
    >
      {renderInner()}
    </Pressable>
  );
});

export const styles = StyleSheet.create({}); // placeholder for future shared styles
export default Button;
