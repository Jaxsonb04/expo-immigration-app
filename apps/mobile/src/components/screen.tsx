import type { ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenBackground } from "@/features/ui/glass";
import { colors, fonts } from "@/features/ui/tokens";

interface ScreenProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

/**
 * Shared screen scaffold: an atmospheric liquid-glass backdrop behind a
 * transparent scroll view, with an iOS-style large title. Glass surfaces
 * (GlassCard) and the native blur tab bar layer on top.
 */
export function Screen({ title, subtitle, children }: ScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
      <ScreenBackground />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: insets.top + 14,
          paddingBottom: insets.bottom + 112,
          gap: 18,
        }}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: 4, marginBottom: 2 }}>
          <Text
            style={{
              color: colors.foreground,
              fontFamily: fonts.display,
              fontSize: 34,
              lineHeight: 40,
              letterSpacing: -0.5,
            }}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 15, lineHeight: 21 }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        {children}
      </ScrollView>
    </View>
  );
}
