import { Text, View } from "react-native";

import { formatMonthDay } from "./date-format";
import { colors, fonts, glass } from "./tokens";

interface DateChipProps {
  value: string;
  tone?: "success" | "warning" | "danger" | "accent";
}

const toneColors = {
  success: colors.successDot,
  warning: colors.warningDot,
  danger: colors.danger,
  accent: colors.accent,
};

export function DateChip({ value, tone = "accent" }: DateChipProps) {
  return (
    <View
      className="items-center justify-center"
      style={{
        backgroundColor: glass.tint,
        borderColor: glass.border,
        borderCurve: "continuous",
        borderRadius: 14,
        borderWidth: 1,
        minHeight: 50,
        width: 58,
      }}
    >
      <Text
        selectable
        style={{
          color: toneColors[tone],
          fontFamily: fonts.bold,
          fontSize: 12,
          fontVariant: ["tabular-nums"],
        }}
      >
        {formatMonthDay(value)}
      </Text>
    </View>
  );
}
