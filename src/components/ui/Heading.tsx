import React from 'react';
import { Text, TextProps } from 'react-native';
import { fontFamilies } from '@/theme/fonts';

type HeadingWeight = 'regular' | 'semibold' | 'bold';

export interface HeadingProps extends TextProps {
  /** Heading weight. Defaults to bold. */
  weight?: HeadingWeight;
}

/**
 * Title text for headings. Renders in Poppins (the heading family), matching the
 * global default; kept as a semantic wrapper for titles.
 */
export const Heading = React.forwardRef<React.ElementRef<typeof Text>, HeadingProps>(
  function Heading({ weight = 'bold', style, ...rest }, ref) {
    return (
      <Text ref={ref} style={[{ fontFamily: fontFamilies.heading[weight] }, style]} {...rest} />
    );
  },
);

export default Heading;
