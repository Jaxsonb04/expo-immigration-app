import { getUpcomingDeadlines, type DeadlineSummary } from "@immigration/shared";

import { formatWeekdayMonthDay } from "@/features/ui/date-format";

export interface DeadlineDayGroup {
  key: string;
  label: string;
  deadlines: DeadlineSummary[];
}

export interface CalendarMonthCell {
  key: string;
  day: number | null;
}

export function buildCalendarMonthCells(year: number, monthIndex: number): CalendarMonthCell[] {
  const firstDayOfMonth = new Date(Date.UTC(year, monthIndex, 1));
  const leadingBlankCount = firstDayOfMonth.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const cells: CalendarMonthCell[] = [];

  for (let index = 0; index < leadingBlankCount; index += 1) {
    cells.push({ key: `blank-start-${index}`, day: null });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ key: `day-${day}`, day });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ key: `blank-end-${cells.length}`, day: null });
  }

  return cells;
}

export function groupDeadlinesByDay(deadlines: DeadlineSummary[]): DeadlineDayGroup[] {
  const groups = new Map<string, DeadlineSummary[]>();

  for (const deadline of getUpcomingDeadlines(deadlines)) {
    const key = deadline.dueAt.slice(0, 10);
    groups.set(key, [...(groups.get(key) ?? []), deadline]);
  }

  return Array.from(groups.entries()).map(([key, items]) => ({
    key,
    label: formatWeekdayMonthDay(items[0]?.dueAt ?? key),
    deadlines: items,
  }));
}

export function getCalendarMarkersForMonth(
  deadlines: DeadlineSummary[],
  year: number,
  monthIndex: number
): Set<number> {
  const markers = new Set<number>();

  for (const deadline of getUpcomingDeadlines(deadlines)) {
    const date = new Date(deadline.dueAt);
    if (date.getUTCFullYear() === year && date.getUTCMonth() === monthIndex) {
      markers.add(date.getUTCDate());
    }
  }

  return markers;
}
