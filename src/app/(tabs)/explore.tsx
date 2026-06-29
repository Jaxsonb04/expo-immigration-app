import type { CalendarDate } from "@internationalized/date";
import { getLocalTimeZone } from "@internationalized/date";
import { Description, FieldError, Label } from "heroui-native";
import { Calendar, DatePicker } from "heroui-native-pro";
import { View } from "react-native";

function formatSpanishDate(date: CalendarDate): string {
  return new Intl.DateTimeFormat("zh-CN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date.toDate(getLocalTimeZone()));
}

export default function DatePickerExample() {
  return (
    <View className="flex-1 justify-center px-5 gap-12 bg-background">
      <DatePicker formatDate={formatSpanishDate} locale="zh-CN">
        <Label>Fecha del evento</Label>
        <DatePicker.Select>
          <DatePicker.Trigger>
            <DatePicker.Value />
            <DatePicker.TriggerIndicator />
          </DatePicker.Trigger>
          <DatePicker.Portal>
            <DatePicker.Overlay />
            <DatePicker.Content presentation="popover" width="trigger">
              <DatePicker.Calendar>
                <Calendar.Header>
                  <Calendar.YearPickerTrigger>
                    <Calendar.YearPickerTriggerHeading />
                    <Calendar.YearPickerTriggerIndicator />
                  </Calendar.YearPickerTrigger>
                  <Calendar.NavButton slot="previous" />
                  <Calendar.NavButton slot="next" />
                </Calendar.Header>
                <Calendar.Grid>
                  <Calendar.GridHeader>
                    {(day) => <Calendar.HeaderCell day={day} />}
                  </Calendar.GridHeader>
                  <Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody>
                </Calendar.Grid>
                <Calendar.YearPickerGrid>
                  <Calendar.YearPickerGridBody>
                    {({ year, isSelected }) => (
                      <Calendar.YearPickerCell year={year} isSelected={isSelected} />
                    )}
                  </Calendar.YearPickerGridBody>
                </Calendar.YearPickerGrid>
              </DatePicker.Calendar>
            </DatePicker.Content>
          </DatePicker.Portal>
        </DatePicker.Select>
      </DatePicker>

      <DatePicker isInvalid>
        <Label>Ship date</Label>
        <DatePicker.Select>
          <DatePicker.Trigger>
            <DatePicker.Value />
            <DatePicker.TriggerIndicator />
          </DatePicker.Trigger>
          <DatePicker.Portal>
            <DatePicker.Overlay />
            <DatePicker.Content presentation="popover" width="trigger">
              <DatePicker.Calendar>
                <Calendar.Header>
                  <Calendar.Heading />
                  <Calendar.NavButton slot="previous" />
                  <Calendar.NavButton slot="next" />
                </Calendar.Header>
                <Calendar.Grid>
                  <Calendar.GridHeader>
                    {(day) => <Calendar.HeaderCell day={day} />}
                  </Calendar.GridHeader>
                  <Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody>
                </Calendar.Grid>
              </DatePicker.Calendar>
            </DatePicker.Content>
          </DatePicker.Portal>
        </DatePicker.Select>
        <Description hideOnInvalid>Must be a business day.</Description>
        <FieldError>Please select a valid ship date.</FieldError>
      </DatePicker>
    </View>
  );
}
