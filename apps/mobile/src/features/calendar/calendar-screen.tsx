import { Text, View } from "react-native";
import { Card } from "heroui-native";
import { getDeadlineUrgency } from "@immigration/shared";

import { Screen } from "@/components/screen";
import { useLoopSnapshot } from "@/features/loop/use-loop-snapshot";
import { DateChip } from "@/features/ui/date-chip";
import { EmptyState } from "@/features/ui/empty-state";
import { SectionHeader } from "@/features/ui/section-header";
import { cardStyle, colors, fonts } from "@/features/ui/tokens";

import {
  buildCalendarMonthCells,
  getCalendarMarkersForMonth,
  groupDeadlinesByDay,
} from "./calendar-model";

const displayedYear = 2026;
const displayedMonthIndex = 6;
const displayedMonthTitle = "July 2026";
const displayedMonthCells = buildCalendarMonthCells(displayedYear, displayedMonthIndex);

export function CalendarScreenContent() {
  const snapshot = useLoopSnapshot();
  const groups = groupDeadlinesByDay(snapshot.deadlines);
  const markerDays = getCalendarMarkersForMonth(
    snapshot.deadlines,
    displayedYear,
    displayedMonthIndex
  );

  return (
    <Screen title="Calendar" subtitle="Deadlines first, calendar second.">
      <Card className="gap-4 p-4" style={cardStyle}>
        <SectionHeader title={displayedMonthTitle} actionLabel="Deadline markers" />
        <View className="flex-row flex-wrap gap-2">
          {displayedMonthCells.map((cell) => {
            const hasMarker = cell.day !== null && markerDays.has(cell.day);
            return (
              <View
                key={cell.key}
                className="items-center justify-center gap-1"
                style={{
                  backgroundColor: cell.day === null ? "transparent" : "#FBFAF6",
                  borderColor: cell.day === null ? "transparent" : colors.border,
                  borderCurve: "continuous",
                  borderRadius: 12,
                  borderWidth: cell.day === null ? 0 : 1,
                  height: 44,
                  width: "12.5%",
                }}
              >
                {cell.day === null ? null : (
                  <>
                    <Text
                      selectable
                      style={{
                        color: colors.foreground,
                        fontFamily: fonts.medium,
                        fontSize: 13,
                        fontVariant: ["tabular-nums"],
                      }}
                    >
                      {cell.day}
                    </Text>
                    <View
                      accessibilityLabel={hasMarker ? "Deadline on this date" : "No deadline"}
                      style={{
                        backgroundColor: hasMarker ? colors.warningDot : "transparent",
                        borderRadius: 999,
                        height: 5,
                        width: 5,
                      }}
                    />
                  </>
                )}
              </View>
            );
          })}
        </View>
      </Card>

      <View className="gap-3">
        <SectionHeader title="Upcoming agenda" />
        {groups.length > 0 ? (
          groups.map((group) => (
            <View key={group.key} className="gap-2">
              <Text selectable style={{ color: colors.muted, fontFamily: fonts.medium, fontSize: 13 }}>
                {group.label}
              </Text>
              {group.deadlines.map((deadline) => {
                const urgency = getDeadlineUrgency(deadline);
                return (
                  <Card key={deadline.id} className="flex-row items-center gap-3 p-4" style={cardStyle}>
                    <DateChip value={deadline.dueAt} tone={urgency.tone} />
                    <View className="flex-1 gap-1">
                      <Text selectable style={{ color: colors.foreground, fontFamily: fonts.semibold, fontSize: 15 }}>
                        {deadline.title}
                      </Text>
                      <Text selectable style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 13 }}>
                        {urgency.label} · {Math.max(urgency.daysUntilDue, 0)} days remaining
                      </Text>
                    </View>
                  </Card>
                );
              })}
            </View>
          ))
        ) : (
          <EmptyState
            title="No upcoming deadlines"
            description="Document expiries, filing windows, and case reminders will appear here."
          />
        )}
      </View>
    </Screen>
  );
}
