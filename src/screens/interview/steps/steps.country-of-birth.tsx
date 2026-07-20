import { withForm } from '@/components/form'
import { View } from 'react-native'
import { fieldValidators } from '../interview.form'
import { stepBodyOptions } from './steps.options'

export const CountryOfBirthStep = withForm({
	...stepBodyOptions,
	render: function Render({ form, formType }) {
		return (
			<View className="gap-card">
				<form.AppField
					name="personFacts.cityOfBirth"
					validators={{
						onBlur: fieldValidators.cityOfBirth,
						onSubmit: fieldValidators.cityOfBirth,
					}}
				>
					{(field) => (
						<field.TextField
							label="City, town, or village of birth"
							autoCapitalize="words"
							isRequired
						/>
					)}
				</form.AppField>
				{/* The I-90 asks only city + country; the state/province box is an
				    I-765-only printed item (15.B). */}
				{formType === 'i765' && (
					<form.AppField name="personFacts.stateProvinceOfBirth">
						{(field) => (
							<field.TextField label="State or province of birth" autoCapitalize="words" />
						)}
					</form.AppField>
				)}
				<form.AppField
					name="personFacts.countryOfBirth"
					validators={{
						onBlur: fieldValidators.countryOfBirth,
						onSubmit: fieldValidators.countryOfBirth,
					}}
				>
					{(field) => (
						<field.TextField label="Country of birth" autoCapitalize="words" isRequired />
					)}
				</form.AppField>
			</View>
		)
	},
})
