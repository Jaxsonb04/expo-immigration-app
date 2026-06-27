import { Pressable, Text, View } from "react-native";

import { colors, fonts } from "./tokens";

type SelectionCardControlRole = "button" | "radio" | "checkbox";

interface SelectionCardProps {
  title: string;
  description?: string;
  selected?: boolean;
  controlRole?: SelectionCardControlRole;
  testID?: string;
  onPress?: () => void;
}

function getAccessibilityState(controlRole: SelectionCardControlRole, selected: boolean) {
  if (controlRole === "radio" || controlRole === "checkbox") {
    return { checked: selected };
  }

  return { selected };
}

export function SelectionCard({
  title,
  description,
  selected = false,
  controlRole = "button",
  testID,
  onPress,
}: SelectionCardProps) {
  return (
    <Pressable
      accessibilityLabel={title}
      accessibilityRole={controlRole}
      accessibilityState={getAccessibilityState(controlRole, selected)}
      onPress={onPress}
      testID={testID}
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
