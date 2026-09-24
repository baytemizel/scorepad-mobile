import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { haptic } from '@/services/feedback';
import { SOCIAL_BUTTON_HEIGHT, SOCIAL_BUTTON_RADIUS } from './socialButtonMetrics';

export interface FacebookSignInButtonProps {
  label: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Sign-in button in Meta's brand style: Facebook blue with the white round
 * "f" mark on the leading edge and a white label. Like the Google button, the
 * colors are fixed rather than themed, and it shares the same footprint so the
 * provider buttons line up.
 */
export function FacebookSignInButton({
  label,
  onPress,
  loading,
  disabled,
  style,
}: FacebookSignInButtonProps) {
  const isDisabled = disabled || loading;

  const handlePress = () => {
    if (isDisabled) return;
    haptic('light');
    onPress?.();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.button,
        pressed && { backgroundColor: '#166FE5' },
        isDisabled && { opacity: 0.6 },
        style,
      ]}
    >
      <View style={styles.icon}>
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <MaterialCommunityIcons name="facebook" size={24} color="#FFFFFF" />
        )}
      </View>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1877F2',
    borderRadius: SOCIAL_BUTTON_RADIUS,
    height: SOCIAL_BUTTON_HEIGHT,
    paddingHorizontal: 16,
  },
  icon: { position: 'absolute', left: 16 },
  label: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});

export default FacebookSignInButton;
