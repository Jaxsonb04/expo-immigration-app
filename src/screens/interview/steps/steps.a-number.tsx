import { withForm } from '@/components/form'
import { fieldValidators } from '../interview.form'
import { stepBodyOptions } from './steps.options'

export const ANumberStep = withForm({
	...stepBodyOptions,
	render: function Render({ form, applicationKind }) {
		const validator = fieldValidators.aNumber(applicationKind)
		return (
			<form.AppField
				name="personFacts.aNumber"
				validators={{ onBlur: validator, onSubmit: validator }}
			>
				{(field) => (
					<field.TextField
						label="A-Number"
						description={
							applicationKind === 'initial'
								? 'Leave blank if you don’t have one yet.'
								: 'The 7–9 digits after the "A" on your card.'
						}
						keyboardType="number-pad"
						maxLength={9}
						isRequired={applicationKind !== 'initial'}
					/>
				)}
			</form.AppField>
		)
	},
})
