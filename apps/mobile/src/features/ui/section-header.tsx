import { Text, View } from "react-native";

import { colors, fonts } from "./tokens";

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
}

export function SectionHeader({ title, actionLabel }: SectionHeaderProps) {
  return (
    <View className="flex-row items-center justify-between">
      <Text
        selectable
        style={{ color: colors.foreground, fontFamily: fonts.semibold, fontSize: 17 }}
      >
        {title}
      </Text>
      {actionLabel ? (
        <Text selectable style={{ color: colors.accent, fontFamily: fonts.medium, fontSize: 13 }}>
          {actionLabel}
        </Text>
      ) : null}
    </View>
  );
}
