import React, { useEffect } from 'react';
import { Text, TextStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const AnimatedText = Animated.createAnimatedComponent(Text);

interface BigScoreProps {
  value: number;
  color: string;
  style?: StyleProp<TextStyle>;
}

/**
 * Score number with a tasteful pop animation when the value changes.
 * The container provides an absolute or flex layout; this only handles the
 * number itself.
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
    <AnimatedText
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.5}
      style={[
        {
          fontSize: 104,
          lineHeight: 108,
          fontWeight: '900',
          color,
          textAlign: 'center',
          letterSpacing: -2,
        },
        animStyle,
        style,
      ]}
      // Avoid system font scaling making the score huge & breaking layout.
      allowFontScaling={false}
    >
      {value}
    </AnimatedText>
  );
}

export default BigScore;
