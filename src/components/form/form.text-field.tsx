import { Description, FieldError, TextField as HeroTextField, Input, Label } from 'heroui-native'
import type { TextInputProps } from 'react-native'
import { KeyboardController } from 'react-native-keyboard-controller'
import { useFieldContext } from './form.context'
import { fieldErrorText } from './form.utils'

type TextFieldProps = {
	label: string
	description?: string
	isRequired?: boolean
	isDisabled?: boolean
	/**
	 * Advance focus to the next form input when the user submits (return key),
	 * keeping the keyboard up — ref-free, via react-native-keyboard-controller.
	 *
	 * Opt-in on purpose: leave it OFF for the last field of a form. Otherwise the
	 * return key is labelled "Next", and on keyboards with no return key (e.g.
	 * `keyboardType="number-pad"`) iOS renders that "Next" as a floating accessory
	 * button — which is confusing when there is nothing to advance to.
	 *
	 * Explicit `returnKeyType` / `submitBehavior` / `onSubmitEditing` passed by the
	 * caller still win (they spread after these defaults).
	 */
	focusNextOnSubmit?: boolean
} & Omit<TextInputProps, 'value' | 'onChangeText' | 'onBlur' | 'editable'>

/** Single-line text field bound to a TanStack string field. */
export default function TextField({
	label,
	description,
	isRequired,
	isDisabled,
	focusNextOnSubmit,
	...inputProps
}: TextFieldProps) {
	const field = useFieldContext<string>()
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
	const error = fieldErrorText(field.state.meta.errors)

	const nextFieldProps: Partial<TextInputProps> = focusNextOnSubmit
		? {
				returnKeyType: 'next',
				submitBehavior: 'submit',
				onSubmitEditing: () => KeyboardController.setFocusTo('next'),
			}
		: {}

	return (
		<HeroTextField isInvalid={isInvalid} isRequired={isRequired} isDisabled={isDisabled}>
			<Label>{label}</Label>
			<Input
				value={field.state.value ?? ''}
				onChangeText={field.handleChange}
				onBlur={field.handleBlur}
				editable={!isDisabled}
				{...nextFieldProps}
				{...inputProps}
			/>
			{description ? <Description>{description}</Description> : null}
			{isInvalid && error ? <FieldError isInvalid>{error}</FieldError> : null}
		</HeroTextField>
	)
}
