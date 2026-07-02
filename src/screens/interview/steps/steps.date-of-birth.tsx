import { withForm } from '@/components/form'
import { fieldValidators } from '../interview.form'
import { stepBodyOptions } from './steps.options'

export const DateOfBirthStep = withForm({
	...stepBodyOptions,
	render: function Render({ form }) {
		return (
			<form.AppField
				name="personFacts.dateOfBirth"
				validators={{ onBlur: fieldValidators.dateOfBirth, onSubmit: fieldValidators.dateOfBirth }}
			>
				{(field) => <field.DateField label="Date of birth" isRequired />}
			</form.AppField>
		)
	},
})
