import { Text, View } from "react-native";
import { Button } from "heroui-native";
import type { HomeStatus } from "@immigration/shared";

import { GlassCard } from "./glass";
import { colors, fonts } from "./tokens";

interface StatusHeroProps {
  status: HomeStatus;
  metric: string;
  caption: string;
}

const toneColors = {
  success: colors.success,
  warning: colors.warning,
  danger: colors.danger,
  accent: colors.accent,
};

export function StatusHero({ status, metric, caption }: StatusHeroProps) {
  return (
    <GlassCard elevated intensity={40} padding={22}>
      <View style={{ gap: 20 }}>
        <View className="flex-row items-start justify-between gap-4">
          <View className="flex-1 gap-2">
            <View className="flex-row items-center gap-2">
              <View
                accessibilityLabel={status.headline}
                style={{
                  backgroundColor: toneColors[status.tone],
                  borderRadius: 999,
                  height: 9,
                  width: 9,
                }}
              />
              <Text
                selectable
                style={{
                  color: colors.muted,
                  fontFamily: fonts.semibold,
                  fontSize: 12,
                  letterSpacing: 0.2,
                }}
              >
                EAD renewal status
              </Text>
            </View>
            <Text
              selectable
              style={{
                color: colors.foreground,
                fontFamily: fonts.display,
                fontSize: 27,
                lineHeight: 32,
                letterSpacing: -0.3,
              }}
            >
              {status.headline}
            </Text>
            <Text
              selectable
              style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 15, lineHeight: 22 }}
            >
              {status.detail}
            </Text>
          </View>
          <View className="items-end" style={{ gap: 2 }}>
            <Text
              selectable
              style={{
                color: toneColors[status.tone],
                fontFamily: fonts.bold,
                fontSize: 34,
                lineHeight: 36,
                fontVariant: ["tabular-nums"],
                letterSpacing: -1,
              }}
            >
              {metric}
            </Text>
            <Text selectable style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 12 }}>
              {caption}
            </Text>
          </View>
        </View>
        <Button size="lg">{status.primaryAction}</Button>
      </View>
    </GlassCard>
  );
}
