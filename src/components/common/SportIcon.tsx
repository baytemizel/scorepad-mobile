import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SportId } from '@/types';
import { sportEngines } from '@/sports';

interface SportIconProps {
  sport: SportId;
  size?: number;
}

/**
 * Circular gradient badge with the sport's emoji icon. Used in lists, headers,
 * and the home screen sport picker.
 */
export function SportIcon({ sport, size = 56 }: SportIconProps) {
  const meta = sportEngines[sport].meta;
  return (
    <LinearGradient
      colors={meta.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        allowFontScaling={false}
        style={{
          fontSize: size * 0.52,
          // Give the glyph comfortable headroom — a line-height equal to the
          // font size clips the top of taller emoji (⚽ 🏐 🎾 🏓). Letting the
          // flex container handle centering keeps the icon crisp and uncropped.
          lineHeight: size * 0.72,
          textAlign: 'center',
          fontFamily: 'System',
        }}
      >
        {meta.icon}
      </Text>
    </LinearGradient>
  );
}

export default SportIcon;
