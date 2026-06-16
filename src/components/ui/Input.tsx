import React from 'react';
import { TextInput, TextInputProps, View, Text } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

interface InputProps extends TextInputProps {
  label?: string;
  errorText?: string;
  /**
   * `onDark` switches the field to a translucent-white palette so it stays
   * legible when placed over a dark image/gradient hero (e.g. the auth screens).
   * Independent of the active light/dark theme.
   */
  tone?: 'default' | 'onDark';
}

export function Input({ label, errorText, style, tone = 'default', ...rest }: InputProps) {
  const theme = useTheme();
  const onDark = tone === 'onDark';

  const labelColor = onDark ? 'rgba(255,255,255,0.92)' : theme.colors.textMuted;
  const fieldBg = onDark ? 'rgba(255,255,255,0.12)' : theme.colors.surface;
  const textColor = onDark ? '#FFFFFF' : theme.colors.text;
  const placeholderColor = onDark ? 'rgba(255,255,255,0.6)' : theme.colors.textMuted;
  const borderColor = errorText
    ? theme.colors.danger
    : onDark
      ? 'rgba(255,255,255,0.28)'
      : theme.colors.border;
  const errorColor = onDark ? '#FCA5A5' : theme.colors.danger;

  return (
    <View style={{ width: '100%' }}>
      {label && (
        <Text
          style={{
            color: labelColor,
            fontSize: theme.fontSizes.sm,
            marginBottom: theme.spacing.xs,
            fontWeight: '600',
          }}
        >
          {label}
        </Text>
      )}
      <TextInput
        placeholderTextColor={placeholderColor}
        {...rest}
        style={[
          {
            backgroundColor: fieldBg,
            borderRadius: theme.radii.md,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.md,
            color: textColor,
            borderWidth: 1,
            borderColor,
            fontSize: theme.fontSizes.md,
            fontFamily: theme.fonts.body.regular,
          },
          style,
        ]}
      />
      {errorText && (
        <Text
          style={{
            color: errorColor,
            fontSize: theme.fontSizes.xs,
            marginTop: theme.spacing.xs,
          }}
        >
          {errorText}
        </Text>
      )}
    </View>
  );
}

export default Input;
