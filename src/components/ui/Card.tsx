import React from 'react';
import { View, ViewProps, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

interface CardProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}

export function Card({ children, style, padded = true, ...rest }: CardProps) {
  const theme = useTheme();
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radii.lg,
          padding: padded ? theme.spacing.lg : 0,
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        theme.shadows.sm,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export default Card;
