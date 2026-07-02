import { Description, FieldError, Label } from 'heroui-native'
import { Calendar, DatePicker, type DatePickerOption } from 'heroui-native-pro'
import { useFieldContext } from './form.context'
import { fieldErrorText } from './form.utils'

export type DateFieldProps = {
	label: string
	placeholder?: string
	description?: string
	isRequired?: boolean
	isDisabled?: boolean
}

/**
 * Map an ISO date string (`YYYY-MM-DD`, the shape `CalendarDate.toString()`
 * produces) to the `DatePickerOption` the picker binds to. The `value` is the
 * ISO string; `label` is the human-readable text shown in the trigger.
 */
function isoToOption(iso: string | undefined): DatePickerOption {
	if (!iso) {
		return undefined
	}
	const parsed = new Date(`${iso}T00:00:00`)
	const label = Number.isNaN(parsed.getTime())
		? iso
		: parsed.toLocaleDateString(undefined, { dateStyle: 'medium' })
	return { value: iso, label }
}

/** Date picker bound to a TanStack string field storing an ISO date (YYYY-MM-DD). */
export default function DateField({
	label,
	placeholder = 'Choose a date',
	description,
	isRequired,
	isDisabled,
}: DateFieldProps) {
	const field = useFieldContext<string>()
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
	const error = fieldErrorText(field.state.meta.errors)

	// DatePicker is itself a form-field root (it provides the FormField context
	// that Label/Description/FieldError read), so there is no outer HeroUI
	// TextField wrapper here.
	return (
		<DatePicker
			value={isoToOption(field.state.value)}
			// DatePicker has no blur event, so mark the field touched on change to
			// surface validation just like the text fields do on blur.
			onValueChange={(option) => {
				field.handleChange(option?.value ?? '')
				field.handleBlur()
			}}
			isInvalid={isInvalid}
			isRequired={isRequired}
			isDisabled={isDisabled}
		>
			<Label>{label}</Label>
			<DatePicker.Select>
				<DatePicker.Trigger>
					<DatePicker.Value placeholder={placeholder} />
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
			{description ? <Description>{description}</Description> : null}
			{isInvalid && error ? <FieldError isInvalid>{error}</FieldError> : null}
		</DatePicker>
	)
}
