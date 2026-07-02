import { withForm } from '@/components/form'
import { fieldValidators } from '../interview.form'
import { stepBodyOptions } from './steps.options'

export const CountryOfBirthStep = withForm({
	...stepBodyOptions,
	render: function Render({ form }) {
		return (
			<form.AppField
				name="personFacts.countryOfBirth"
				validators={{
					onBlur: fieldValidators.countryOfBirth,
					onSubmit: fieldValidators.countryOfBirth,
				}}
			>
				{(field) => <field.TextField label="Country of birth" autoCapitalize="words" isRequired />}
			</form.AppField>
		)
	},
})
