import { withForm } from '@/components/form'
import { View } from 'react-native'
import { fieldValidators, replacementReasonOptions } from '../interview.form'
import { stepBodyOptions } from './steps.options'

export const CardDetailsStep = withForm({
	...stepBodyOptions,
	render: function Render({ form, applicationKind, formType }) {
		const reasonValidator = fieldValidators.replacementReason(applicationKind)
		return (
			<View className="gap-4">
				<form.AppField
					name="form.cardExpirationDate"
					validators={{
						onBlur: fieldValidators.cardExpirationDate,
						onSubmit: fieldValidators.cardExpirationDate,
					}}
				>
					{(field) => (
						<field.DateField
							label="Card expiration date"
							description="On the front of your Permanent Resident Card. Leave blank if you no longer have the card."
						/>
					)}
				</form.AppField>
				{applicationKind === 'replacement' && (
					<form.AppField
						name="form.replacementReason"
						validators={{ onBlur: reasonValidator, onSubmit: reasonValidator }}
					>
						{(field) => (
							<field.RadioGroupField
								label="What happened to your card?"
								options={replacementReasonOptions(formType)}
								isRequired
							/>
						)}
					</form.AppField>
				)}
			</View>
		)
	},
})
