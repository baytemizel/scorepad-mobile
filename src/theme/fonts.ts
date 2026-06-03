/**
 * Font system for ScorePad.
 *
 * Two families:
 *  - Poppins (sans)    -> default for all text (body, labels, buttons, scores, headings).
 *  - Jaro (display)    -> the "ScorePad" logo wordmark only, via `fontFamilies.logo`.
 *
 * React Native does not synthesize weights for custom fonts, so every weight is a
 * distinct family name. `installGlobalFont()` patches the base `Text` component so
 * existing `fontWeight` styles automatically resolve to the matching Poppins file,
 * which means most of the app gets Poppins without any per-call-site changes.
 */
import React from 'react';
import { StyleSheet, Text } from 'react-native';

import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
  Poppins_900Black,
} from '@expo-google-fonts/poppins';
import { Jaro_400Regular } from '@expo-google-fonts/jaro';

/** Asset map consumed by `useFonts` in the root layout. Keys become the family names. */
export const fontAssets = {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
  Poppins_900Black,
  Jaro_400Regular,
};

/** Weight-specific family names. Use these directly in styles when needed. */
export const fontFamilies = {
  body: {
    regular: 'Poppins_400Regular',
    medium: 'Poppins_500Medium',
    semibold: 'Poppins_600SemiBold',
    bold: 'Poppins_700Bold',
    extrabold: 'Poppins_800ExtraBold',
    black: 'Poppins_900Black',
  },
  heading: {
    regular: 'Poppins_400Regular',
    semibold: 'Poppins_600SemiBold',
    bold: 'Poppins_700Bold',
  },
  /** Display font for the "ScorePad" logo wordmark only. */
  logo: 'Jaro_400Regular',
} as const;

type FontWeightValue = string | number | undefined;

/** Map an RN fontWeight to the matching Poppins family (defaults to regular). */
export function resolveBodyFont(weight: FontWeightValue): string {
  switch (String(weight ?? '400')) {
    case '500':
      return fontFamilies.body.medium;
    case '600':
      return fontFamilies.body.semibold;
    case '700':
    case 'bold':
      return fontFamilies.body.bold;
    case '800':
      return fontFamilies.body.extrabold;
    case '900':
      return fontFamilies.body.black;
    default:
      return fontFamilies.body.regular;
  }
}

/** Map an RN fontWeight to the matching heading (Poppins) family. */
export function resolveHeadingFont(weight: FontWeightValue): string {
  switch (String(weight ?? '700')) {
    case '400':
    case 'normal':
    case '500':
      return fontFamilies.heading.regular;
    case '600':
      return fontFamilies.heading.semibold;
    default:
      return fontFamilies.heading.bold;
  }
}

let installed = false;

/**
 * Make Poppins the app-wide default by patching the base `Text` render so any text
 * without an explicit `fontFamily` picks the Poppins file matching its `fontWeight`.
 * Text that already sets `fontFamily` (e.g. the Jaro logo) is left untouched.
 * Call once, before the first render.
 */
export function installGlobalFont(): void {
  if (installed) return;
  installed = true;

  const Component = Text as unknown as {
    render?: (...args: unknown[]) => unknown;
    __scorepadFontPatched?: boolean;
  };
  if (Component.__scorepadFontPatched) return;

  const originalRender = Component.render;
  if (typeof originalRender !== 'function') return;

  Component.render = function patchedTextRender(...args: unknown[]) {
    const element = originalRender.apply(this, args);
    if (!React.isValidElement(element)) return element;

    const style = (element.props as { style?: unknown }).style;
    const flat = (StyleSheet.flatten(style) ?? {}) as {
      fontFamily?: string;
      fontWeight?: FontWeightValue;
    };
    if (flat.fontFamily) return element;

    return React.cloneElement(element as React.ReactElement<{ style?: unknown }>, {
      style: [{ fontFamily: resolveBodyFont(flat.fontWeight) }, style],
    });
  };
  Component.__scorepadFontPatched = true;
}
