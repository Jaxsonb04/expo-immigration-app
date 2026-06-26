import { Text, View } from "react-native";
import { Button, Card } from "heroui-native";
import type { HomeStatus } from "@immigration/shared";

import { cardStyle, colors, fonts } from "./tokens";

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
    <Card className="gap-5 p-5" style={cardStyle}>
      <View className="flex-row items-start justify-between gap-4">
        <View className="flex-1 gap-2">
          <View className="flex-row items-center gap-2">
            <View
              accessibilityLabel={status.headline}
              style={{
                backgroundColor: toneColors[status.tone],
                borderRadius: 999,
                height: 10,
                width: 10,
              }}
            />
            <Text
              selectable
              style={{ color: colors.muted, fontFamily: fonts.medium, fontSize: 13 }}
            >
              EAD renewal status
            </Text>
          </View>
          <Text
            selectable
            style={{
              color: colors.foreground,
              fontFamily: fonts.display,
              fontSize: 26,
              lineHeight: 32,
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
        <View className="items-end">
          <Text
            selectable
            style={{
              color: toneColors[status.tone],
              fontFamily: fonts.semibold,
              fontSize: 28,
              fontVariant: ["tabular-nums"],
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
    </Card>
  );
}
