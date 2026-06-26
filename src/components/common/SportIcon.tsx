import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SportId } from '@/types';
import { sportEngines } from '@/sports';

type MdiName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface SportIconProps {
  sport: SportId;
  size?: number;
}

/**
 * Circular gradient badge with the sport's Material icon. Used in lists,
 * headers, and the home screen sport picker.
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
      <MaterialCommunityIcons
        name={meta.mdiIcon as MdiName}
        size={Math.round(size * 0.56)}
        color="#fff"
      />
    </LinearGradient>
  );
}

export default SportIcon;
