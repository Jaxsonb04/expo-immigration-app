import { Text, View } from "react-native";
import { Button } from "heroui-native";

import { colors, fonts } from "./tokens";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
}

export function EmptyState({ title, description, actionLabel }: EmptyStateProps) {
  return (
    <View className="items-center gap-3 py-8">
      <View
        style={{
          backgroundColor: "#FBFAF6",
          borderColor: colors.border,
          borderCurve: "continuous",
          borderRadius: 22,
          borderWidth: 1,
          height: 72,
          width: 72,
        }}
      />
      <Text
        selectable
        style={{ color: colors.foreground, fontFamily: fonts.semibold, fontSize: 18 }}
      >
        {title}
      </Text>
      <Text
        selectable
        style={{
          color: colors.muted,
          fontFamily: fonts.body,
          fontSize: 14,
          lineHeight: 20,
          maxWidth: 260,
          textAlign: "center",
        }}
      >
        {description}
      </Text>
      {actionLabel ? <Button variant="outline">{actionLabel}</Button> : null}
    </View>
  );
}
