import React, { useEffect } from 'react';
import { Text, TextStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

interface BigScoreProps {
  value: number;
  color: string;
  style?: StyleProp<TextStyle>;
}

/**
 * Score number with a tasteful pop animation when the value changes.
 * The container provides flex layout; this only handles the number itself.
 */
export function BigScore({ value, color, style }: BigScoreProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    scale.value = withSequence(
      withTiming(1.18, { duration: 90 }),
      withSpring(1, { damping: 8, stiffness: 200 }),
    );
    opacity.value = withSequence(
      withTiming(0.85, { duration: 60 }),
      withTiming(1, { duration: 140 }),
    );
  }, [value, scale, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animStyle}>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.5}
        style={[
          {
            fontSize: 100,
            lineHeight: 100,
            fontWeight: '900',
            color,
            textAlign: 'center',
            letterSpacing: -2,
            includeFontPadding: false,
          },
          style,
        ]}
        // Avoid system font scaling making the score huge & breaking layout.
        allowFontScaling={false}
      >
        {value}
      </Text>
    </Animated.View>
  );
}

export default BigScore;
