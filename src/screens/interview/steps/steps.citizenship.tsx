import { withForm } from '@/components/form'
import { View } from 'react-native'
import { fieldValidators } from '../interview.form'
import { stepBodyOptions } from './steps.options'

/** I-765 only: citizenship/nationality (distinct from country of birth). */
export const CitizenshipStep = withForm({
	...stepBodyOptions,
	render: function Render({ form }) {
		return (
			<View className="gap-card">
				<form.AppField
					name="personFacts.countryOfCitizenship"
					validators={{
						onBlur: fieldValidators.countryOfCitizenship,
						onSubmit: fieldValidators.countryOfCitizenship,
					}}
				>
					{(field) => (
						<field.TextField label="Country of citizenship" autoCapitalize="words" isRequired />
					)}
				</form.AppField>
				<form.AppField name="personFacts.secondCountryOfCitizenship">
					{(field) => (
						<field.TextField
							label="Second country of citizenship"
							description="Only if you hold citizenship in more than one country."
							autoCapitalize="words"
						/>
					)}
				</form.AppField>
			</View>
		)
	},
})
