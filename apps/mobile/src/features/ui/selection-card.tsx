import { Pressable, Text, View } from "react-native";

import { colors, fonts } from "./tokens";

interface SelectionCardProps {
  title: string;
  description?: string;
  selected?: boolean;
  onPress?: () => void;
}

export function SelectionCard({ title, description, selected = false, onPress }: SelectionCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        backgroundColor: selected ? colors.foreground : colors.surface,
        borderColor: selected ? colors.foreground : colors.border,
        borderCurve: "continuous",
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
      }}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <Text
            selectable
            style={{
              color: selected ? "#FFFFFF" : colors.foreground,
              fontFamily: fonts.semibold,
              fontSize: 15,
            }}
          >
            {title}
          </Text>
          {description ? (
            <Text
              selectable
              style={{
                color: selected ? "#F1EFE8" : colors.muted,
                fontFamily: fonts.body,
                fontSize: 13,
                lineHeight: 19,
              }}
            >
              {description}
            </Text>
          ) : null}
        </View>
        <Text
          selectable
          style={{ color: selected ? "#FFFFFF" : colors.hint, fontFamily: fonts.semibold }}
        >
          {selected ? "✓" : "○"}
        </Text>
      </View>
    </Pressable>
  );
}
