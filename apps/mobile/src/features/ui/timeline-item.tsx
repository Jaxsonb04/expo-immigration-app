import { Text, View } from "react-native";
import type { CaseStatusEvent } from "@immigration/shared";

import { formatWeekdayMonthDay } from "./date-format";
import { colors, fonts } from "./tokens";

interface TimelineItemProps {
  event: CaseStatusEvent;
  isLast?: boolean;
}

export function TimelineItem({ event, isLast = false }: TimelineItemProps) {
  return (
    <View className="flex-row gap-3">
      <View className="items-center">
        <View
          style={{
            backgroundColor: colors.accent,
            borderRadius: 999,
            height: 12,
            marginTop: 4,
            width: 12,
          }}
        />
        {!isLast ? <View style={{ backgroundColor: colors.border, flex: 1, width: 1 }} /> : null}
      </View>
      <View className="flex-1 gap-1 pb-5">
        <Text selectable style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 12 }}>
          {formatWeekdayMonthDay(event.occurredAt)} · Manual
        </Text>
        <Text
          selectable
          style={{ color: colors.foreground, fontFamily: fonts.semibold, fontSize: 15 }}
        >
          {event.status}
        </Text>
        <Text
          selectable
          style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 19 }}
        >
          {event.statusText}
        </Text>
      </View>
    </View>
  );
}
