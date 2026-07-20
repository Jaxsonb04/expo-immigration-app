import { withForm } from '@/components/form'
import { View } from 'react-native'
import {
	ethnicityOptions,
	eyeColorOptions,
	fieldValidators,
	hairColorOptions,
	heightFeetOptions,
	heightInchesOptions,
	raceOptions,
} from '../interview.form'
import { stepBodyOptions } from './steps.options'

/** I-90 only: Part 3 Biographic Information. */
export const PhysicalDescriptionStep = withForm({
	...stepBodyOptions,
	render: function Render({ form }) {
		return (
			<View className="gap-card">
				<View className="flex-row gap-tight">
					<View className="flex-1">
						<form.AppField
							name="personFacts.heightFeet"
							validators={{
								onBlur: fieldValidators.heightFeet,
								onSubmit: fieldValidators.heightFeet,
							}}
						>
							{(field) => (
								<field.SelectField label="Height" options={heightFeetOptions} isRequired />
							)}
						</form.AppField>
					</View>
					<View className="flex-1">
						<form.AppField
							name="personFacts.heightInches"
							validators={{
								onBlur: fieldValidators.heightInches,
								onSubmit: fieldValidators.heightInches,
							}}
						>
							{(field) => (
								<field.SelectField label="Inches" options={heightInchesOptions} isRequired />
							)}
						</form.AppField>
					</View>
				</View>
				<form.AppField
					name="personFacts.weightPounds"
					validators={{
						onBlur: fieldValidators.weightPounds,
						onSubmit: fieldValidators.weightPounds,
					}}
				>
					{(field) => (
						<field.TextField
							label="Weight (pounds)"
							keyboardType="number-pad"
							maxLength={3}
							isRequired
						/>
					)}
				</form.AppField>
				<form.AppField
					name="personFacts.eyeColor"
					validators={{ onBlur: fieldValidators.eyeColor, onSubmit: fieldValidators.eyeColor }}
				>
					{(field) => (
						<field.SelectField label="Eye color" options={[...eyeColorOptions]} isRequired />
					)}
				</form.AppField>
				<form.AppField
					name="personFacts.hairColor"
					validators={{ onBlur: fieldValidators.hairColor, onSubmit: fieldValidators.hairColor }}
				>
					{(field) => (
						<field.SelectField label="Hair color" options={[...hairColorOptions]} isRequired />
					)}
				</form.AppField>
				<form.AppField
					name="personFacts.ethnicity"
					validators={{ onBlur: fieldValidators.ethnicity, onSubmit: fieldValidators.ethnicity }}
				>
					{(field) => (
						<field.RadioGroupField label="Ethnicity" options={[...ethnicityOptions]} isRequired />
					)}
				</form.AppField>
				<form.AppField
					name="personFacts.races"
					validators={{ onBlur: fieldValidators.races, onSubmit: fieldValidators.races }}
				>
					{(field) => (
						<field.CheckboxGroupField
							label="Race"
							description="Select all that apply — matches the official form's options."
							options={[...raceOptions]}
							isRequired
						/>
					)}
				</form.AppField>
			</View>
		)
	},
})
