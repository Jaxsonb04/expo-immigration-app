import { withForm } from '@/components/form'
import { View } from 'react-native'
import {
	eligibilityCategoryOptions,
	fieldValidators,
	replacementReasonOptions,
} from '../interview.form'
import { stepBodyOptions } from './steps.options'

export const EligibilityCategoryStep = withForm({
	...stepBodyOptions,
	render: function Render({ form, applicationKind, formType }) {
		const reasonValidator = fieldValidators.replacementReason(applicationKind)
		return (
			<View className="gap-4">
				<form.AppField
					name="personFacts.eligibilityCategory"
					validators={{
						onBlur: fieldValidators.eligibilityCategory,
						onSubmit: fieldValidators.eligibilityCategory,
					}}
				>
					{(field) => (
						<field.SelectField
							label="Eligibility category"
							options={[...eligibilityCategoryOptions]}
							placeholder="Choose your category"
							description='Find it on your current EAD under "Category".'
							isRequired
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
