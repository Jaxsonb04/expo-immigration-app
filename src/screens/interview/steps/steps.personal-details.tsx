import { withForm } from '@/components/form'
import { View } from 'react-native'
import { fieldValidators, genderOptions } from '../interview.form'
import { stepBodyOptions } from './steps.options'

/** I-90 only: Part 1 Additional Information (sex, parents, admission). */
export const PersonalDetailsStep = withForm({
	...stepBodyOptions,
	render: function Render({ form }) {
		return (
			<View className="gap-card">
				<form.AppField
					name="personFacts.gender"
					validators={{ onBlur: fieldValidators.gender, onSubmit: fieldValidators.gender }}
				>
					{(field) => (
						<field.RadioGroupField
							label="Sex"
							description="As it will appear on your card. The official form offers these two options."
							options={[...genderOptions]}
							isRequired
						/>
					)}
				</form.AppField>
				<form.AppField
					name="personFacts.motherGivenName"
					validators={{
						onBlur: fieldValidators.motherGivenName,
						onSubmit: fieldValidators.motherGivenName,
					}}
				>
					{(field) => (
						<field.TextField
							label="Mother's given (first) name"
							autoCapitalize="words"
							isRequired
						/>
					)}
				</form.AppField>
				<form.AppField
					name="personFacts.fatherGivenName"
					validators={{
						onBlur: fieldValidators.fatherGivenName,
						onSubmit: fieldValidators.fatherGivenName,
					}}
				>
					{(field) => (
						<field.TextField
							label="Father's given (first) name"
							autoCapitalize="words"
							isRequired
						/>
					)}
				</form.AppField>
				<form.AppField
					name="personFacts.classOfAdmission"
					validators={{
						onBlur: fieldValidators.classOfAdmission,
						onSubmit: fieldValidators.classOfAdmission,
					}}
				>
					{(field) => (
						<field.TextField
							label="Class of admission"
							description='The category code on your Green Card under "Category" (for example IR1, E21).'
							autoCapitalize="characters"
							isRequired
						/>
					)}
				</form.AppField>
				<form.AppField
					name="personFacts.dateOfAdmission"
					validators={{
						onBlur: fieldValidators.dateOfAdmission,
						onSubmit: fieldValidators.dateOfAdmission,
					}}
				>
					{(field) => (
						<field.DateField
							label="Date of admission"
							description='The "Resident Since" date on your Green Card.'
							isRequired
						/>
					)}
				</form.AppField>
			</View>
		)
	},
})
