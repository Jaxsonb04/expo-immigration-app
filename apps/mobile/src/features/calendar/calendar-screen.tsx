import { useState } from "react";
import { Text, View } from "react-native";
import { Button } from "heroui-native";
import { Calendar } from "heroui-native-pro";
import { getLocalTimeZone, parseDate, today, type DateValue } from "@internationalized/date";
import { getDeadlineUrgency, getUpcomingDeadlines, type DeadlineSummary } from "@immigration/shared";

import { Screen } from "@/components/screen";
import { localLoopRepository } from "@/features/loop/repository";
import { useLoopSnapshot } from "@/features/loop/use-loop-snapshot";
import { DateChip } from "@/features/ui/date-chip";
import { formatWeekdayMonthDay } from "@/features/ui/date-format";
import { EmptyState } from "@/features/ui/empty-state";
import { GlassCard } from "@/features/ui/glass";
import { SectionHeader } from "@/features/ui/section-header";
import { colors, fonts } from "@/features/ui/tokens";

import { buildReminderPlanItems, groupDeadlinesByDay } from "./calendar-model";

function DeadlineRow({ deadline }: { deadline: DeadlineSummary }) {
  const urgency = getDeadlineUrgency(deadline);
  return (
    <View className="flex-row items-center gap-3">
      <DateChip value={deadline.dueAt} tone={urgency.tone} />
      <View className="flex-1 gap-1">
        <Text
          selectable
          style={{ color: colors.foreground, fontFamily: fonts.semibold, fontSize: 15 }}
        >
          {deadline.title}
        </Text>
        <Text selectable style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 13 }}>
          {urgency.label} · {Math.max(urgency.daysUntilDue, 0)} days remaining
        </Text>
      </View>
    </View>
  );
}

export function CalendarScreenContent() {
  const snapshot = useLoopSnapshot();
  const [reminders, setReminders] = useState(() => snapshot.reminders ?? []);
  const upcoming = getUpcomingDeadlines(snapshot.deadlines);
  const deadlineKeys = new Set(upcoming.map((deadline) => deadline.dueAt.slice(0, 10)));
  const [selected, setSelected] = useState<DateValue>(() =>
    upcoming[0] ? parseDate(upcoming[0].dueAt.slice(0, 10)) : today(getLocalTimeZone())
  );
  const groups = groupDeadlinesByDay(snapshot.deadlines);
  const reminderItems = buildReminderPlanItems(snapshot.deadlines, reminders);

  const selectedKey = selected.toString();
  const selectedDeadlines = upcoming.filter(
    (deadline) => deadline.dueAt.slice(0, 10) === selectedKey
  );

  function saveReminderInteraction(reminderId: string, action: "acknowledge" | "snooze") {
    const result = localLoopRepository.saveReminderInteraction({
      reminderId,
      action,
      actedAt: new Date().toISOString(),
      snoozeDays: action === "snooze" ? 7 : undefined,
    });

    if (result.accepted) {
      setReminders(localLoopRepository.getSnapshot().reminders ?? []);
    }
  }

  return (
    <Screen title="Calendar" subtitle="Deadlines first, calendar second.">
      <GlassCard padding={14}>
        <View className="gap-2">
          <SectionHeader title="Deadline calendar" actionLabel="Tap a date" />
          <Calendar value={selected} onChange={setSelected} accessibilityLabel="Deadline calendar">
            <Calendar.Header>
              <Calendar.Heading />
              <Calendar.NavButton slot="previous" />
              <Calendar.NavButton slot="next" />
            </Calendar.Header>
            <Calendar.Grid>
              <Calendar.GridHeader>
                {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
              </Calendar.GridHeader>
              <Calendar.GridBody>
                {(date) => {
                  const hasDeadline = deadlineKeys.has(date.toString());
                  return (
                    <Calendar.Cell date={date}>
                      {(renderProps) => (
                        <Calendar.CellBody cellRenderProps={renderProps}>
                          <Calendar.CellLabel cellRenderProps={renderProps}>
                            {renderProps.formattedDate}
                          </Calendar.CellLabel>
                          <View
                            pointerEvents="none"
                            style={{
                              position: "absolute",
                              bottom: 5,
                              left: 0,
                              right: 0,
                              alignItems: "center",
                            }}
                          >
                            <View
                              style={{
                                backgroundColor: hasDeadline ? colors.warningDot : "transparent",
                                borderRadius: 999,
                                height: 6,
                                width: 6,
                              }}
                            />
                          </View>
                        </Calendar.CellBody>
                      )}
                    </Calendar.Cell>
                  );
                }}
              </Calendar.GridBody>
            </Calendar.Grid>
          </Calendar>
        </View>
      </GlassCard>

      {selectedDeadlines.length > 0 ? (
        <GlassCard elevated padding={16}>
          <View className="gap-3">
            <SectionHeader title={`On ${formatWeekdayMonthDay(selectedDeadlines[0].dueAt)}`} />
            {selectedDeadlines.map((deadline) => (
              <DeadlineRow key={deadline.id} deadline={deadline} />
            ))}
          </View>
        </GlassCard>
      ) : null}

      <View className="gap-3">
        <SectionHeader title="Upcoming agenda" />
        {groups.length > 0 ? (
          groups.map((group) => (
            <View key={group.key} className="gap-2">
              <Text
                selectable
                style={{ color: colors.muted, fontFamily: fonts.medium, fontSize: 13 }}
              >
                {group.label}
              </Text>
              {group.deadlines.map((deadline) => (
                <GlassCard key={deadline.id} padding={14}>
                  <DeadlineRow deadline={deadline} />
                </GlassCard>
              ))}
            </View>
          ))
        ) : (
          <EmptyState
            title="No upcoming deadlines"
            description="Document expiries, filing windows, and case reminders will appear here."
          />
        )}
      </View>

      <View className="gap-3">
        <SectionHeader title="Reminder plan" actionLabel="Local" />
        {reminderItems.length > 0 ? (
          reminderItems.map((item) => (
            <GlassCard key={item.id} padding={16}>
              <View className="gap-3">
                <View className="gap-1">
                  <Text
                    selectable
                    style={{ color: colors.foreground, fontFamily: fonts.semibold, fontSize: 15 }}
                  >
                    {item.title}
                  </Text>
                  <Text
                    selectable
                    style={{ color: colors.accent, fontFamily: fonts.medium, fontSize: 13 }}
                  >
                    {item.statusLabel}
                  </Text>
                  <Text
                    selectable
                    style={{
                      color: colors.muted,
                      fontFamily: fonts.body,
                      fontSize: 13,
                      lineHeight: 20,
                    }}
                  >
                    {item.detail}
                  </Text>
                </View>
                <View className="flex-row gap-2">
                  <Button
                    className="flex-1"
                    onPress={() => saveReminderInteraction(item.reminderId, "acknowledge")}
                    testID={`calendar-reminder-ack-${item.reminderId}`}
                  >
                    {item.primaryActionLabel}
                  </Button>
                  <Button
                    className="flex-1"
                    variant="outline"
                    onPress={() => saveReminderInteraction(item.reminderId, "snooze")}
                    testID={`calendar-reminder-snooze-${item.reminderId}`}
                  >
                    {item.secondaryActionLabel}
                  </Button>
                </View>
              </View>
            </GlassCard>
          ))
        ) : (
          <EmptyState
            title="No reminders planned"
            description="Upcoming deadlines can schedule local reminder checkpoints here."
          />
        )}
      </View>
    </Screen>
  );
}
