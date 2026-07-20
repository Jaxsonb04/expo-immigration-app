import { withForm } from '@/components/form'
import { ScreeningStopNotice } from '@/components/screening-stop'
import { I765_CATEGORY_NOT_LISTED, I765_CATEGORY_STOP } from '@convex/shared/screening'
import { View } from 'react-native'
import {
	eligibilityCategoryOptions,
	fieldValidators,
	replacementReasonOptions,
	yesNoOptions,
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
				{/* Category-specific printed items (29-30), asked only for the
				    category that requires them. */}
				<form.Subscribe selector={(state) => state.values.personFacts.eligibilityCategory}>
					{(category) => (
						<>
							{category === 'C26' && (
								<form.AppField
									name="form.c26SpouseReceiptNumber"
									validators={{
										onBlur: fieldValidators.c26SpouseReceiptNumber,
										onSubmit: fieldValidators.c26SpouseReceiptNumber,
									}}
								>
									{(field) => (
										<field.TextField
											label="Your spouse's H-1B receipt number"
											description="The 13-character receipt on their most recent Form I-797 for Form I-129 (for example WAC1234567890)."
											autoCapitalize="characters"
											maxLength={13}
											isRequired
										/>
									)}
								</form.AppField>
							)}
							{category === 'C08' && (
								<form.AppField
									name="form.c8EverArrestedOrConvicted"
									validators={{
										onBlur: fieldValidators.requiredChoice,
										onSubmit: fieldValidators.requiredChoice,
									}}
								>
									{(field) => (
										<field.RadioGroupField
											label="Have you EVER been arrested for and/or convicted of any crime?"
											description={
												'Answering "Yes" is allowed — the form then requires certified court dispositions for each arrest or conviction, which will appear in your document checklist. Consider getting legal help before filing.'
											}
											options={[...yesNoOptions]}
											isRequired
										/>
									)}
								</form.AppField>
							)}
						</>
					)}
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
