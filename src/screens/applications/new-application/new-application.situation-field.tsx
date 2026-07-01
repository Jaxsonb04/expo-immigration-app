import { withForm, type RadioGroupFieldOption } from '@/components/form'
import { newApplicationFormOptions, requiredChoice } from './new-application.form'

export const SituationField = withForm({
	...newApplicationFormOptions,
	props: {} as { options: RadioGroupFieldOption[] },
	render: function Render({ form, options }) {
		return (
			<form.AppField name="situationKey" validators={{ onMount: requiredChoice, onChange: requiredChoice }}>
				{(field) => (
					<field.RadioGroupField
						label="What do you need to do?"
						options={options}
						isRequired
					/>
				)}
			</form.AppField>
		)
	},
})
