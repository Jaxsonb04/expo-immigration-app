import { withForm, type RadioGroupFieldOption } from '@/components/form'
import { NEW_DEPENDENT_CHOICE } from './new-application.data'
import { newApplicationFormOptions, requiredChoice } from './new-application.form'

export const ApplicantField = withForm({
	...newApplicationFormOptions,
	props: {} as { options: RadioGroupFieldOption[] },
	render: function Render({ form, options }) {
		return (
			<form.AppField
				name="applicantChoice"
				validators={{ onMount: requiredChoice, onChange: requiredChoice }}
				listeners={{
					// The name field unmounts when switching away from "Someone
					// else"; reset it so a stale validation error can't keep the
					// form unsubmittable.
					onChange: ({ value }) => {
						if (value !== NEW_DEPENDENT_CHOICE) form.resetField('dependentName')
					},
				}}
			>
				{(field) => (
					<field.RadioGroupField label="Who is this for?" options={options} isRequired />
				)}
			</form.AppField>
		)
	},
})
