import type { TextStyle, ViewStyle } from "react-native";

/**
 * Modern iOS / Liquid Glass design tokens.
 * Cool, calm, trustworthy palette tuned so translucent glass surfaces read
 * clearly over an atmospheric gradient backdrop. See DESIGN.md.
 */
export const colors = {
  // Backdrop base (the gradient atmosphere is layered on top in ScreenBackground).
  background: "#EEF2F8",
  // Translucent glass fill used as the tint over a BlurView.
  surface: "rgba(255,255,255,0.72)",
  surfaceSolid: "#FFFFFF",
  foreground: "#161A22",
  muted: "#5A6373",
  hint: "#8B94A4",
  border: "rgba(120,140,170,0.22)",
  accent: "#1366D6",
  accentSoft: "rgba(19,102,214,0.12)",
  success: "#1E874B",
  successDot: "#34C759",
  warning: "#A65A0B",
  warningDot: "#FF9F0A",
  danger: "#D23344",
};

/** Glass-specific tokens for blur tint, hairline borders, and atmosphere washes. */
export const glass = {
  /** Translucent white laid over the BlurView so the frost reads on light content. */
  tint: "rgba(255,255,255,0.55)",
  tintStrong: "rgba(255,255,255,0.72)",
  /** Hairline that gives a glass edge definition on busy backgrounds. */
  border: "rgba(255,255,255,0.55)",
  borderSoft: "rgba(120,140,170,0.28)",
  /** Atmospheric gradient washes behind the glass — varied color so the frost refracts. */
  washTop: "rgba(40,108,242,0.26)",
  washMid: "rgba(96,164,246,0.12)",
  washBottom: "rgba(34,200,205,0.16)",
  washAccent: "rgba(124,92,240,0.12)",
  shadow: "#0B1B3A",
};

export const fonts = {
  display: "Fraunces_600SemiBold",
  displayMedium: "Fraunces_500Medium",
  body: "DMSans_400Regular",
  medium: "DMSans_500Medium",
  semibold: "DMSans_600SemiBold",
  bold: "DMSans_700Bold",
};

export const radius = {
  card: 22,
  field: 14,
  chip: 999,
};

/**
 * Translucent glass surface for any remaining heroui Card usages; prefer the
 * GlassCard primitive (real backdrop blur) for prominent surfaces.
 */
export const cardStyle: ViewStyle = {
  backgroundColor: colors.surface,
  borderColor: glass.border,
  borderCurve: "continuous",
  borderRadius: radius.card,
  borderWidth: 1,
};

export const titleText: TextStyle = {
  color: colors.foreground,
  fontFamily: fonts.display,
};

export const bodyText: TextStyle = {
  color: colors.foreground,
  fontFamily: fonts.body,
};
