import { Pressable, Text, View } from "react-native";

import { colors, fonts, glass } from "./tokens";

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
        backgroundColor: selected ? colors.accentSoft : glass.tint,
        borderColor: selected ? colors.accent : glass.border,
        borderCurve: "continuous",
        borderRadius: 16,
        borderWidth: selected ? 1.5 : 1,
        padding: 16,
      }}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <Text
            selectable
            style={{
              color: colors.foreground,
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
                color: colors.muted,
                fontFamily: fonts.body,
                fontSize: 13,
                lineHeight: 19,
              }}
            >
              {description}
            </Text>
          ) : null}
        </View>
        <View
          style={{
            alignItems: "center",
            backgroundColor: selected ? colors.accent : "transparent",
            borderColor: selected ? colors.accent : colors.hint,
            borderRadius: controlRole === "checkbox" ? 7 : 999,
            borderWidth: 1.5,
            height: 22,
            justifyContent: "center",
            width: 22,
          }}
        >
          {selected ? (
            <Text style={{ color: "#FFFFFF", fontFamily: fonts.bold, fontSize: 13 }}>✓</Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
