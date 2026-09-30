/**
 * Organic light-theme tokens.
 * Category swatches and expense/danger reds are not part of this palette.
 */
export const organic = {
  bg: '#f5ead8',
  surface: '#ebddc5',
  text: '#201e1d',
  accent: '#c67139',
  accent2: '#7a8a5e',
  /** Body text at 16% opacity. */
  divider: 'rgba(32, 30, 29, 0.16)',
  neutral: {
    100: '#f9f4ed',
    200: '#eee7db',
    300: '#dcd3c4',
    400: '#c0b6a5',
    500: '#a19786',
    600: '#82796a',
    700: '#645c50',
    800: '#474238',
    900: '#2e2b25',
  },
  accentRamp: {
    100: '#fff2eb',
    200: '#ffe1d0',
    300: '#ffc6a5',
    400: '#f6a06b',
    500: '#d67f48',
    600: '#b2622d',
    700: '#8c491a',
    800: '#643312',
    900: '#402310',
  },
  accent2Ramp: {
    100: '#f0fae1',
    200: '#e1eecc',
    300: '#ccdbb2',
    400: '#aebf92',
    500: '#8fa073',
    600: '#728157',
    700: '#56633f',
    800: '#3d472b',
    900: '#272e1b',
  },
} as const;

/**
 * Semantic light-theme colors used by screens.
 * Muted copy uses neutral 700 and income text uses accent-2 700 so both
 * clear ~4.5:1 on `bg` (the core mid steps sit closer to ~3:1).
 */
export const colors = {
  bg: organic.bg,
  surface: organic.surface,
  text: organic.text,
  muted: organic.neutral[700],
  accent: organic.accent,
  accentSoft: organic.accentRamp[100],
  success: organic.accent2,
  successText: organic.accent2Ramp[700],
  divider: organic.divider,
  /** Inactive chips and secondary neutral buttons. */
  chip: organic.neutral[300],
  onAccent: '#ffffff',
  neutral: organic.neutral,
  accentRamp: organic.accentRamp,
  accent2Ramp: organic.accent2Ramp,
} as const;

/** Sync screens already read this object; values are the Organic light tokens. */
export const syncColors = {
  background: colors.bg,
  card: colors.surface,
  primary: colors.accent,
  /** Former indigo `#818CF8` — focus rings use accent. */
  primaryMuted: colors.accent,
  text: colors.text,
  muted: colors.muted,
  border: colors.divider,
  danger: '#B91C1C',
  badgeOffBg: organic.neutral[200],
  badgeOffText: organic.neutral[700],
  badgeOnBg: organic.accent2Ramp[100],
  badgeOnText: organic.accent2Ramp[800],
  onPrimary: colors.onAccent,
  secondary: colors.accentSoft,
  switchTrackOff: organic.neutral[300],
  switchTrackOn: organic.accentRamp[200],
  switchThumbOff: organic.neutral[500],
};
