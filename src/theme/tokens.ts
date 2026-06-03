/**
 * ScorePad design system.
 *
 * - Colors are defined as semantic tokens with light + dark variants.
 * - Spacing follows an 8pt grid with an extra 4pt half-step.
 * - Typography uses Poppins everywhere (body, titles, headings); Jaro is reserved
 *   for the "ScorePad" logo wordmark. Families live in `./fonts`.
 *
 * Consume via `useTheme()` in `src/theme/ThemeProvider.tsx`.
 */

import { fontFamilies } from './fonts';

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  bg: string;
  bgElevated: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  textInverse: string;
  primary: string;
  primaryDark: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  homeTeam: string;
  awayTeam: string;
  overlay: string;
}

const palette = {
  blue500: '#2563EB',
  blue600: '#1D4ED8',
  blue700: '#1E40AF',
  emerald500: '#10B981',
  amber500: '#F59E0B',
  red500: '#EF4444',
  red600: '#DC2626',
  orange500: '#F97316',
  cyan500: '#06B6D4',
  violet500: '#8B5CF6',
  slate50: '#F8FAFC',
  slate100: '#F1F5F9',
  slate200: '#E2E8F0',
  slate300: '#CBD5E1',
  slate400: '#94A3B8',
  slate500: '#64748B',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1E293B',
  slate900: '#0F172A',
  slate950: '#020617',
  navy: '#0B1220',
};

export const lightColors: ThemeColors = {
  bg: palette.slate50,
  bgElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: palette.slate100,
  border: palette.slate200,
  text: palette.slate900,
  textMuted: palette.slate500,
  textInverse: '#FFFFFF',
  primary: palette.blue600,
  primaryDark: palette.blue700,
  accent: palette.orange500,
  success: palette.emerald500,
  warning: palette.amber500,
  danger: palette.red500,
  homeTeam: palette.blue600,
  awayTeam: palette.red500,
  overlay: 'rgba(15, 23, 42, 0.5)',
};

export const darkColors: ThemeColors = {
  bg: palette.navy,
  bgElevated: palette.slate900,
  surface: palette.slate800,
  surfaceAlt: palette.slate700,
  border: palette.slate700,
  text: palette.slate50,
  textMuted: palette.slate400,
  textInverse: palette.slate900,
  primary: palette.blue500,
  primaryDark: palette.blue700,
  accent: palette.orange500,
  success: palette.emerald500,
  warning: palette.amber500,
  danger: palette.red500,
  homeTeam: '#3B82F6',
  awayTeam: '#F87171',
  overlay: 'rgba(0, 0, 0, 0.6)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  huge: 64,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};

export const fontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  xxxl: 36,
  display: 56,
  scoreboard: 140,
};

export const fontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  black: '900',
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
};

/** Darken a hex color by mixing toward black. `amount` is 0..1 (0 = unchanged). */
export const shade = (hex: string, amount: number): string => {
  const m = hex.replace('#', '');
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const num = parseInt(full, 16);
  const r = Math.round(((num >> 16) & 0xff) * (1 - amount));
  const g = Math.round(((num >> 8) & 0xff) * (1 - amount));
  const b = Math.round((num & 0xff) * (1 - amount));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
};

export const gradients = {
  primary: ['#2563EB', '#06B6D4'] as [string, string],
  hero: ['#0B1220', '#1D4ED8'] as [string, string],
  basketball: ['#F97316', '#EA580C'] as [string, string],
  football: ['#10B981', '#047857'] as [string, string],
  volleyball: ['#F59E0B', '#D97706'] as [string, string],
  tennis: ['#84CC16', '#65A30D'] as [string, string],
  tabletennis: ['#EF4444', '#DC2626'] as [string, string],
  premium: ['#8B5CF6', '#2563EB'] as [string, string],
};

export interface Theme {
  mode: ThemeMode;
  colors: ThemeColors;
  spacing: typeof spacing;
  radii: typeof radii;
  fontSizes: typeof fontSizes;
  fontWeights: typeof fontWeights;
  fonts: typeof fontFamilies;
  shadows: typeof shadows;
  gradients: typeof gradients;
}

export const buildTheme = (mode: ThemeMode): Theme => ({
  mode,
  colors: mode === 'light' ? lightColors : darkColors,
  spacing,
  radii,
  fontSizes,
  fontWeights,
  fonts: fontFamilies,
  shadows,
  gradients,
});
