import { StyledLucideIcon } from '@/components/styled-icon'
import { Description, FieldError, TextField as HeroTextField, Label } from 'heroui-native'
import { Pressable, View } from 'react-native'
import { useFieldContext } from './form.context'
import { fieldErrorText } from './form.utils'

export type CheckboxGroupFieldOption = {
	value: string
	label: string
	description?: string
}

export type CheckboxGroupFieldProps = {
	label: string
	options: CheckboxGroupFieldOption[]
	description?: string
	isRequired?: boolean
	isDisabled?: boolean
}

/** Multi-select checkbox group bound to a TanStack string[] field. */
export default function CheckboxGroupField({
	label,
	options,
	description,
	isRequired,
	isDisabled,
}: CheckboxGroupFieldProps) {
	const field = useFieldContext<string[]>()
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
	const error = fieldErrorText(field.state.meta.errors)
	const selected = field.state.value ?? []

	function toggle(value: string) {
		// Immutable update; touch on change (no blur event on pressables).
		field.handleChange(
			selected.includes(value)
				? selected.filter((existing) => existing !== value)
				: [...selected, value],
		)
		field.handleBlur()
	}

	return (
		<HeroTextField isInvalid={isInvalid} isRequired={isRequired} isDisabled={isDisabled}>
			<Label>{label}</Label>
			<View className="gap-tight">
				{options.map((option) => {
					const isChecked = selected.includes(option.value)
					return (
						<Pressable
							key={option.value}
							accessibilityRole="checkbox"
							accessibilityState={{ checked: isChecked, disabled: isDisabled }}
							disabled={isDisabled}
							onPress={() => toggle(option.value)}
							className="flex-row items-center gap-control rounded-xl bg-surface-secondary p-control"
						>
							<StyledLucideIcon
								name={isChecked ? 'square-check' : 'square'}
								size={20}
								className={isChecked ? 'text-accent' : 'text-muted'}
							/>
							<View className="flex-1 gap-hairline">
								<Label>{option.label}</Label>
								{option.description ? <Description>{option.description}</Description> : null}
							</View>
						</Pressable>
					)
				})}
			</View>
			{description ? <Description>{description}</Description> : null}
			{isInvalid && error ? <FieldError isInvalid>{error}</FieldError> : null}
		</HeroTextField>
	)
}
