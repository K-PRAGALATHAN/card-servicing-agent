/** Design tokens. Two palettes (light/dark) with identical keys; the active one
 * is provided by PreferencesContext via `useColors()`. Un-migrated screens can
 * still import the static light `colors` export. */
export interface Palette {
  navy: string;
  navyDark: string;
  ink: string;
  muted: string;
  line: string;
  bg: string;
  card: string;
  ok: string;
  danger: string;
  dangerDark: string;
  dangerLine: string;
  dangerTint: string;
  okTint: string;
  white: string;
  gold: string;
}

export const lightColors: Palette = {
  navy: "#004C8F",
  navyDark: "#00335F",
  ink: "#0B1F33",
  muted: "#6B7B8C",
  line: "#E4E9EF",
  bg: "#F2F4F7",
  card: "#FFFFFF",
  ok: "#1B9E5A",
  danger: "#B3261E",
  dangerDark: "#8C1D18",
  dangerLine: "#E4B6B2",
  dangerTint: "#FBEDEC",
  okTint: "#E6F5EC",
  white: "#FFFFFF",
  gold: "#E6C878",
};

export const darkColors: Palette = {
  navy: "#2A5E92", // header + primary + accent (readable on dark surfaces)
  navyDark: "#0B2740", // credit-card surface
  ink: "#E7EEF5", // primary text
  muted: "#93A4B4",
  line: "#26333F",
  bg: "#0E1621", // page background
  card: "#18232F", // raised surfaces
  ok: "#34C77B",
  danger: "#F0655D",
  dangerDark: "#F0655D",
  dangerLine: "#5A2A28",
  dangerTint: "#2A1A1A",
  okTint: "#12301F",
  white: "#FFFFFF", // stays white (text on navy / credit card)
  gold: "#E6C878",
};

/** Back-compat default (light). Prefer `useColors()` in migrated components. */
export const colors = lightColors;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  pill: 999,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
} as const;

export const type = {
  h1: 20,
  h2: 16,
  body: 14,
  small: 12,
  tiny: 11,
} as const;
