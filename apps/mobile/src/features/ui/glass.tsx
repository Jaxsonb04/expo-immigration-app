import type { ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

import { colors, glass, radius } from "./tokens";

interface GlassCardProps {
  children: ReactNode;
  style?: ViewStyle;
  /** Backdrop-blur strength (0–100). */
  intensity?: number;
  /** Inner padding; pass 0 for full-bleed content. */
  padding?: number;
  /** Slightly more opaque tint for hero/foreground surfaces. */
  elevated?: boolean;
  testID?: string;
}

/**
 * Liquid-glass surface: a real backdrop blur (expo-blur) under a translucent
 * tint and a hairline edge, with soft depth shadow. The shadow lives on an
 * outer view so the inner `overflow: hidden` clip doesn't swallow it.
 */
export function GlassCard({
  children,
  style,
  intensity = 32,
  padding = 18,
  elevated = false,
  testID,
}: GlassCardProps) {
  return (
    <View style={[styles.shadow, style]} testID={testID}>
      <View style={styles.clip}>
        <BlurView intensity={intensity} tint="light" style={StyleSheet.absoluteFill} />
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: elevated ? glass.tintStrong : glass.tint },
          ]}
        />
        <View style={{ padding }}>{children}</View>
      </View>
    </View>
  );
}

/**
 * Atmospheric backdrop the glass refracts: a cool base with a soft blue wash at
 * the top and a faint teal wash at the bottom. Calm, not flashy.
 */
export function ScreenBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
      {/* Blue light pooling from the top-left */}
      <LinearGradient
        colors={[glass.washTop, glass.washMid, "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.95, y: 0.62 }}
        style={styles.washTop}
      />
      {/* Soft violet accent, upper-right, for depth */}
      <LinearGradient
        colors={[glass.washAccent, "transparent"]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.3, y: 0.5 }}
        style={styles.washTop}
      />
      {/* Teal pooling from the bottom-right */}
      <LinearGradient
        colors={["transparent", glass.washBottom]}
        start={{ x: 1, y: 0.45 }}
        end={{ x: 0.1, y: 1 }}
        style={styles.washBottom}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: radius.card,
    borderCurve: "continuous",
    shadowColor: glass.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 22,
  },
  clip: {
    borderRadius: radius.card,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: glass.border,
    overflow: "hidden",
  },
  washTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "72%",
  },
  washBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "42%",
  },
});
