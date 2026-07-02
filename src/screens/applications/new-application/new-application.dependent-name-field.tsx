import { withForm } from '@/components/form'
import { NEW_DEPENDENT_CHOICE } from './new-application.data'
import { newApplicationFormOptions } from './new-application.form'

/** Rendered only while "Someone else" is selected. */
export const DependentNameField = withForm({
	...newApplicationFormOptions,
	render: function Render({ form }) {
		return (
			<form.Subscribe selector={(state) => state.values.applicantChoice === NEW_DEPENDENT_CHOICE}>
				{(isNewDependent) =>
					isNewDependent ? (
						<form.AppField
							name="dependentName"
							validators={{
								// Requirement depends on the applicant choice, so re-run
								// whenever that field changes (clears a stale error when the
								// user switches back to an existing applicant).
								onChangeListenTo: ['applicantChoice'],
								onChange: ({ value, fieldApi }) =>
									fieldApi.form.getFieldValue('applicantChoice') === NEW_DEPENDENT_CHOICE &&
									value.trim().length === 0
										? 'Enter their name'
										: undefined,
							}}
						>
							{(field) => (
								<field.TextField
									label="Their name"
									placeholder="e.g. Ana Santos"
									isRequired
									autoCapitalize="words"
								/>
							)}
						</form.AppField>
					) : null
				}
			</form.Subscribe>
		)
	},
})
