import { Text, View } from "react-native";
import { Button, Card } from "heroui-native";
import { getDeadlineUrgency } from "@immigration/shared";

import { Screen } from "@/components/screen";
import { useLoopSnapshot } from "@/features/loop/use-loop-snapshot";
import { DateChip } from "@/features/ui/date-chip";
import { EmptyState } from "@/features/ui/empty-state";
import { SectionHeader } from "@/features/ui/section-header";
import { StatusHero } from "@/features/ui/status-hero";
import { cardStyle, colors, fonts } from "@/features/ui/tokens";

import { buildHomeSections } from "./home-model";

export function HomeScreenContent() {
  const snapshot = useLoopSnapshot();
  const sections = buildHomeSections(snapshot);
  const [nextDeadline] = sections.upcoming;
  const nextUrgency = nextDeadline ? getDeadlineUrgency(nextDeadline) : null;

  return (
    <Screen title="Home" subtitle="Your renewal loop at a glance.">
      <StatusHero
        status={sections.hero}
        metric={nextUrgency ? String(Math.max(nextUrgency.daysUntilDue, 0)) : "--"}
        caption={nextUrgency ? "days left" : "no date"}
      />

      <View className="gap-3">
        <SectionHeader title="Upcoming" actionLabel="View all" />
        {sections.upcoming.length > 0 ? (
          sections.upcoming.map((deadline) => {
            const urgency = getDeadlineUrgency(deadline);
            return (
              <Card key={deadline.id} className="flex-row items-center gap-3 p-4" style={cardStyle}>
                <DateChip value={deadline.dueAt} tone={urgency.tone} />
                <View className="flex-1 gap-1">
                  <Text
                    selectable
                    style={{ color: colors.foreground, fontFamily: fonts.semibold, fontSize: 15 }}
                  >
                    {deadline.title}
                  </Text>
                  <Text
                    selectable
                    style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 13 }}
                  >
                    {urgency.label} · {Math.max(urgency.daysUntilDue, 0)} days remaining
                  </Text>
                </View>
              </Card>
            );
          })
        ) : (
          <EmptyState
            title="No deadlines yet"
            description="Add your EAD expiry date and renewal reminders will appear here."
            actionLabel="Add details"
          />
        )}
      </View>

      <View className="gap-3">
        <SectionHeader title="Your forms" actionLabel="View all" />
        {sections.forms.map((form) => (
          <Card key={form.id} className="gap-3 p-4" style={cardStyle}>
            <View className="gap-1">
              <Text
                selectable
                style={{ color: colors.foreground, fontFamily: fonts.semibold, fontSize: 16 }}
              >
                {form.title}
              </Text>
              <Text selectable style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 13 }}>
                {form.detail}
              </Text>
            </View>
            <Button variant="outline">{form.action}</Button>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
