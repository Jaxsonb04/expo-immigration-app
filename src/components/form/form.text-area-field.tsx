import { Description, FieldError, TextField as HeroTextField, Label, TextArea } from 'heroui-native'
import type { TextInputProps } from 'react-native'
import { useFieldContext } from './form.context'
import { fieldErrorText } from './form.utils'

type TextAreaFieldProps = {
	label: string
	description?: string
	isRequired?: boolean
	isDisabled?: boolean
} & Omit<TextInputProps, 'value' | 'onChangeText' | 'onBlur' | 'editable' | 'multiline'>

/** Multi-line text field bound to a TanStack string field. */
export default function TextAreaField({
	label,
	description,
	isRequired,
	isDisabled,
	...inputProps
}: TextAreaFieldProps) {
	const field = useFieldContext<string>()
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
	const error = fieldErrorText(field.state.meta.errors)

	return (
		<HeroTextField isInvalid={isInvalid} isRequired={isRequired} isDisabled={isDisabled}>
			<Label>{label}</Label>
			<TextArea
				value={field.state.value ?? ''}
				onChangeText={field.handleChange}
				onBlur={field.handleBlur}
				editable={!isDisabled}
				{...inputProps}
			/>
			{description ? <Description>{description}</Description> : null}
			{isInvalid && error ? <FieldError isInvalid>{error}</FieldError> : null}
		</HeroTextField>
	)
}
