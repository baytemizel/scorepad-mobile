import React from 'react';
import { TextInput, TextInputProps, View, Text } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

interface InputProps extends TextInputProps {
  label?: string;
  errorText?: string;
}

export function Input({ label, errorText, style, ...rest }: InputProps) {
  const theme = useTheme();
  return (
    <View style={{ width: '100%' }}>
      {label && (
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: theme.fontSizes.sm,
            marginBottom: theme.spacing.xs,
            fontWeight: '600',
          }}
        >
          {label}
        </Text>
      )}
      <TextInput
        placeholderTextColor={theme.colors.textMuted}
        {...rest}
        style={[
          {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radii.md,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.md,
            color: theme.colors.text,
            borderWidth: 1,
            borderColor: errorText ? theme.colors.danger : theme.colors.border,
            fontSize: theme.fontSizes.md,
            fontFamily: theme.fonts.body.regular,
          },
          style,
        ]}
      />
      {errorText && (
        <Text
          style={{
            color: theme.colors.danger,
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
