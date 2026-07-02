import { withForm } from '@/components/form'
import { newApplicationFormOptions } from './new-application.form'

export const Submit = withForm({
	...newApplicationFormOptions,
	render: function Render({ form }) {
		return (
			<form.AppForm>
				<form.SubmitButton label="Start application" />
			</form.AppForm>
		)
	},
})
