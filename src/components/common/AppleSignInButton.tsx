import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { haptic } from '@/services/feedback';
import { isAppleSignInAvailable } from '@/services/auth';
import { SOCIAL_BUTTON_HEIGHT, SOCIAL_BUTTON_RADIUS } from './socialButtonMetrics';

export interface AppleSignInButtonProps {
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Apple's own "Sign in with Apple" control rather than a look-alike: App Review
 * checks custom Apple buttons against the HIG (official logo, fixed titles,
 * title-to-height ratio), and the system button meets those by construction.
 * It localizes its title itself, following the device language rather than
 * the in-app one. White is the style Apple prescribes on dark backgrounds such
 * as the auth hero.
 *
 * Renders nothing where Sign in with Apple isn't offered (Android).
 */
export function AppleSignInButton({
  onPress,
  loading,
  disabled,
  style,
}: AppleSignInButtonProps) {
  // Every iOS version the app runs on (15.1+) supports it, so render right
  // away instead of popping in after the async check; the check can only hide.
  const [available, setAvailable] = useState(Platform.OS === 'ios');

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let active = true;
    void isAppleSignInAvailable().then((ok) => {
      if (active) setAvailable(ok);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!available) return null;

  const isDisabled = disabled || loading;

  return (
    // The native control has no disabled state, so block touches around it.
    <View
      pointerEvents={isDisabled ? 'none' : 'auto'}
      style={[styles.wrap, isDisabled && { opacity: 0.6 }, style]}
    >
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
        cornerRadius={SOCIAL_BUTTON_RADIUS}
        style={styles.button}
        onPress={() => {
          haptic('light');
          onPress?.();
        }}
      />
      {loading && (
        <View style={styles.spinner} pointerEvents="none">
          <ActivityIndicator color="#000000" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  button: { width: '100%', height: SOCIAL_BUTTON_HEIGHT },
  // The leading slot the Google button spins in, clear of Apple's centered
  // logo and title.
  spinner: {
    position: 'absolute',
    left: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
});

export default AppleSignInButton;
