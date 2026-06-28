import type { ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenBackground } from "@/features/ui/glass";
import { colors, fonts, glass } from "@/features/ui/tokens";

interface ScreenProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  /** Show the top-right account avatar (opens the Profile modal). Default true. */
  showProfile?: boolean;
  /** When provided, the top-right shows a "Done" action instead of the avatar (modal use). */
  onClose?: () => void;
}

function ProfileAvatar() {
  return (
    <Link href="/profile" asChild>
      <Pressable
        accessibilityLabel="Account"
        accessibilityRole="button"
        testID="open-profile"
        hitSlop={8}
        style={{
          alignItems: "center",
          backgroundColor: glass.tintStrong,
          borderColor: glass.border,
          borderCurve: "continuous",
          borderRadius: 999,
          borderWidth: 1,
          height: 42,
          justifyContent: "center",
          width: 42,
        }}
      >
        <Ionicons name="person" size={20} color={colors.foreground} />
      </Pressable>
    </Link>
  );
}

function CloseAction({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" hitSlop={8} onPress={onPress} testID="close-screen">
      <Text style={{ color: colors.accent, fontFamily: fonts.semibold, fontSize: 16 }}>Done</Text>
    </Pressable>
  );
}

/**
 * Shared screen scaffold: a liquid-glass backdrop behind a transparent scroll
 * view, an iOS-style large title, and an optional top-right account avatar
 * (or a Done action in modal contexts).
 */
export function Screen({ title, subtitle, children, showProfile = true, onClose }: ScreenProps) {
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
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 2,
          }}
        >
          <View style={{ flex: 1, gap: 4 }}>
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
                style={{
                  color: colors.muted,
                  fontFamily: fonts.body,
                  fontSize: 15,
                  lineHeight: 21,
                }}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
          {onClose ? (
            <CloseAction onPress={onClose} />
          ) : showProfile ? (
            <ProfileAvatar />
          ) : null}
        </View>
        {children}
      </ScrollView>
    </View>
  );
}
