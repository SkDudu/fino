export const colors = {
  primary: "#00E6A3",
  primaryDark: "#00C98F",
  secondary: "#00C2FF",
  accent: "#7C4DFF",
  success: "#22C55E",
  warning: "#F59E0B",
  error: "#EF4444",
  background: "#0F172A",
  surface: "#1E293B",
  elevatedSurface: "#273549",
  divider: "rgba(255,255,255,0.08)",
  text: "#F8FAFC",
  textSecondary: "#CBD5E1",
  textTertiary: "#64748B",
  textDisabled: "#475569",
  buttonPrimaryText: "#071018",
  overlay: "rgba(0,0,0,0.45)",
  accentSoft: "#7C4DFF1F",
  primarySoft: "#00E6A31F",
  userBubble: "#0F3D36",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  "4xl": 48,
  "5xl": 64,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  input: 14,
  full: 999,
} as const;

export const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semiBold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
} as const;

export const typography = {
  display: { fontSize: 36, fontFamily: fonts.bold, lineHeight: 44 },
  h1: { fontSize: 30, fontFamily: fonts.bold, lineHeight: 36 },
  h2: { fontSize: 24, fontFamily: fonts.semiBold, lineHeight: 30 },
  h3: { fontSize: 20, fontFamily: fonts.semiBold, lineHeight: 26 },
  title: { fontSize: 18, fontFamily: fonts.semiBold, lineHeight: 24 },
  body: { fontSize: 16, fontFamily: fonts.regular, lineHeight: 22 },
  small: { fontSize: 14, fontFamily: fonts.regular, lineHeight: 20 },
  caption: { fontSize: 12, fontFamily: fonts.medium, lineHeight: 16 },
} as const;

export const shadows = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  fab: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;

export const layout = {
  buttonHeight: 56,
  inputHeight: 52,
  fabSize: 64,
} as const;

export const animation = {
  duration: 200,
} as const;

export const theme = { colors, spacing, radius, fonts, typography, shadows, layout, animation };
