import { Description, FieldError, TextField as HeroTextField, Label, Select } from 'heroui-native'
import { useFieldContext } from './form.context'
import { fieldErrorText } from './form.utils'

export type SelectFieldOption = {
	value: string
	label: string
}

export type SelectFieldProps = {
	label: string
	options: SelectFieldOption[]
	placeholder?: string
	description?: string
	isRequired?: boolean
	isDisabled?: boolean
}

/** Dropdown select bound to a TanStack string field. */
export default function SelectField({
	label,
	options,
	placeholder = 'Select an option',
	description,
	isRequired,
	isDisabled,
}: SelectFieldProps) {
	const field = useFieldContext<string>()
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
	const error = fieldErrorText(field.state.meta.errors)
	// HeroUI's Select binds to a `SelectOption` object, not a bare string, so
	// translate between the stored string value and the option shape.
	const selected = options.find((option) => option.value === field.state.value)

	return (
		<HeroTextField isInvalid={isInvalid} isRequired={isRequired} isDisabled={isDisabled}>
			<Label>{label}</Label>
			<Select
				value={selected}
				// Select has no blur event, so mark the field touched on change to
				// surface validation just like the text fields do on blur.
				onValueChange={(option) => {
					field.handleChange(option?.value ?? '')
					field.handleBlur()
				}}
				isDisabled={isDisabled}
			>
				<Select.Trigger>
					<Select.Value placeholder={placeholder} />
					<Select.TriggerIndicator />
				</Select.Trigger>
				<Select.Portal>
					<Select.Overlay />
					<Select.Content presentation="popover" width="trigger">
						{options.map((option) => (
							<Select.Item key={option.value} value={option.value} label={option.label} />
						))}
					</Select.Content>
				</Select.Portal>
			</Select>
			{description ? <Description>{description}</Description> : null}
			{isInvalid && error ? <FieldError isInvalid>{error}</FieldError> : null}
		</HeroTextField>
	)
}
