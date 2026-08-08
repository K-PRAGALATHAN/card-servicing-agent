/** Design tokens, matching the approved wireframe (HDFC-style navy + serious danger red). */
export const colors = {
  navy: "#004C8F",
  navyDark: "#00335F",
  ink: "#0B1F33",
  muted: "#6B7B8C",
  line: "#E4E9EF",
  bg: "#F2F4F7",
  card: "#FFFFFF",
  ok: "#1B9E5A",
  // Serious banking danger red (reserved for destructive actions only).
  danger: "#B3261E",
  dangerDark: "#8C1D18",
  dangerLine: "#E4B6B2",
  dangerTint: "#FBEDEC",
  white: "#FFFFFF",
  gold: "#E6C878",
} as const;

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
