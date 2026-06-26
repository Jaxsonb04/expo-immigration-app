import type { TextStyle, ViewStyle } from "react-native";

export const colors = {
  background: "#F1EFE8",
  surface: "#FFFFFF",
  foreground: "#1F1E1C",
  muted: "#5F5E5A",
  hint: "#9A968C",
  border: "#E6E3DA",
  accent: "#185FA5",
  success: "#3B6D11",
  successDot: "#639922",
  warning: "#854F0B",
  warningDot: "#EF9F27",
  danger: "#A32D2D",
};

export const fonts = {
  display: "Fraunces_600SemiBold",
  displayMedium: "Fraunces_500Medium",
  body: "DMSans_400Regular",
  medium: "DMSans_500Medium",
  semibold: "DMSans_600SemiBold",
  bold: "DMSans_700Bold",
};

export const cardStyle: ViewStyle = {
  backgroundColor: colors.surface,
  borderColor: colors.border,
  borderCurve: "continuous",
  borderRadius: 18,
  borderWidth: 1,
  boxShadow: "0 1px 2px rgba(31, 30, 28, 0.05)",
};

export const titleText: TextStyle = {
  color: colors.foreground,
  fontFamily: fonts.display,
};

export const bodyText: TextStyle = {
  color: colors.foreground,
  fontFamily: fonts.body,
};
