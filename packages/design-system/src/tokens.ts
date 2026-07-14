/**
 * Tokens do design system do Grinta, extraídos do protótipo
 * (docs/04-ui-ux/Prototipo): tema escuro estilo eFootball com acento verde-neon,
 * tipografia bold itálica uppercase e badges de status (verde/âmbar/vermelho).
 * Framework-agnóstico (usado por web/Next.js e React Native/Expo).
 */
export const color = {
  // Fundos
  background: "#0a0b0d",
  backgroundElevated: "#101216",
  surface: "#14171c",
  surfaceRaised: "#1b1f26",
  border: "#2a2f38",
  borderStrong: "#3a4150",

  // Acento primário (verde-neon)
  primary: "#c2f74a",
  primaryDim: "#9ac531",
  primaryContrast: "#0a0b0d",

  // Texto
  text: "#f4f6f8",
  textMuted: "#8b929c",
  textFaint: "#5b616b",

  // Status
  success: "#4ade80",
  warning: "#f5a623",
  danger: "#ef4444",
  info: "#5c7ce0",

  // Times
  home: "#e05c5c",
  away: "#5c7ce0",

  // Moedas
  coin: "#4aa3f7",
  gem: "#e0489a",
  energy: "#f5c518",
} as const;

export type ColorToken = keyof typeof color;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xl2: 24,
  xl3: 32,
  xl4: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xl2: 28,
  xl3: 36,
  display: 48,
} as const;

export const fontWeight = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  black: "800",
} as const;

export const typography = {
  /** Headings esportivos: bold itálico uppercase. */
  heading: {
    fontWeight: fontWeight.black,
    fontStyle: "italic",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  body: {
    fontWeight: fontWeight.regular,
    fontStyle: "normal",
  },
  numericDisplay: {
    fontWeight: fontWeight.black,
    fontStyle: "italic",
  },
} as const;
