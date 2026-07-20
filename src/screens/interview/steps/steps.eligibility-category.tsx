import { withForm } from '@/components/form'
import { ScreeningStopNotice } from '@/components/screening-stop'
import { I765_CATEGORY_NOT_LISTED, I765_CATEGORY_STOP } from '@convex/shared/screening'
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
			<View className="gap-card">
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
				{/* Explicit category boundary: "not listed" never validates — it
				    stops here with the official next step instead of guessing. */}
				<form.Subscribe selector={(state) => state.values.personFacts.eligibilityCategory}>
					{(category) =>
						category === I765_CATEGORY_NOT_LISTED ? (
							<ScreeningStopNotice stop={I765_CATEGORY_STOP} />
						) : null
					}
				</form.Subscribe>
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
