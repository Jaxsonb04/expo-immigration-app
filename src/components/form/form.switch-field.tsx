import { Description, FieldError, TextField as HeroTextField, Label, Switch } from 'heroui-native'
import { View } from 'react-native'
import { useFieldContext } from './form.context'
import { fieldErrorText } from './form.utils'

export type SwitchFieldProps = {
	label: string
	description?: string
	isRequired?: boolean
	isDisabled?: boolean
}

/** Toggle switch bound to a TanStack boolean field. */
export default function SwitchField({
	label,
	description,
	isRequired,
	isDisabled,
}: SwitchFieldProps) {
	const field = useFieldContext<boolean>()
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
	const error = fieldErrorText(field.state.meta.errors)

	return (
		<HeroTextField isInvalid={isInvalid} isRequired={isRequired} isDisabled={isDisabled}>
			<View className="flex-row items-center justify-between gap-3">
				<Label>{label}</Label>
				<Switch
					isSelected={field.state.value}
					// Switch has no blur event, so mark the field touched on change to
					// surface validation just like the text fields do on blur.
					onSelectedChange={(isSelected) => {
						field.handleChange(isSelected)
						field.handleBlur()
					}}
					isDisabled={isDisabled}
				/>
			</View>
			{description ? <Description>{description}</Description> : null}
			{isInvalid && error ? <FieldError isInvalid>{error}</FieldError> : null}
		</HeroTextField>
	)
}
