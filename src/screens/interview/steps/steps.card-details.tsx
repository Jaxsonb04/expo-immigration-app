import { withForm } from '@/components/form'
import { ScreeningStopNotice } from '@/components/screening-stop'
import { isI90CardStatus, screenI90 } from '@convex/shared/screening'
import { View } from 'react-native'
import {
	cardStatusOptions,
	fieldValidators,
	nameChangeOptions,
	replacementReasonOptions,
} from '../interview.form'
import { stepBodyOptions } from './steps.options'

export const CardDetailsStep = withForm({
	...stepBodyOptions,
	render: function Render({ form, applicationKind, formType }) {
		const reasonValidator = fieldValidators.replacementReason(applicationKind)
		const statusValidator = fieldValidators.cardStatus(applicationKind)
		return (
			<View className="gap-card">
				<form.AppField
					name="form.cardStatus"
					validators={{ onBlur: statusValidator, onSubmit: statusValidator }}
				>
					{(field) => (
						<field.RadioGroupField
							label="What kind of card do you have?"
							options={[...cardStatusOptions]}
							isRequired
						/>
					)}
				</form.AppField>
				{/* Screening boundary, explained in place: a 2-year conditional card
				    on a renewal is unsupported (I-751/I-829), and the step can never
				    validate or complete while it's selected. */}
				<form.Subscribe selector={(state) => state.values.form.cardStatus}>
					{(cardStatus) => {
						const screening = isI90CardStatus(cardStatus)
							? screenI90(cardStatus, applicationKind)
							: null
						return screening !== null && !screening.supported ? (
							<ScreeningStopNotice stop={screening} />
						) : null
					}}
				</form.Subscribe>
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
				<form.AppField
					name="form.nameChangedSinceIssuance"
					validators={{
						onBlur: fieldValidators.requiredChoice,
						onSubmit: fieldValidators.requiredChoice,
					}}
				>
					{(field) => (
						<field.RadioGroupField
							label="Has your name legally changed since this card was issued?"
							options={[...nameChangeOptions]}
							isRequired
						/>
					)}
				</form.AppField>
				<form.Subscribe selector={(state) => state.values.form.nameChangedSinceIssuance}>
					{(answer) =>
						answer === 'yes' ? (
							<View className="gap-card">
								<form.AppField
									name="form.previousFamilyName"
									validators={{
										onBlur: fieldValidators.previousFamilyName,
										onSubmit: fieldValidators.previousFamilyName,
									}}
								>
									{(field) => (
										<field.TextField
											label="Family name printed on your current card"
											autoCapitalize="words"
											isRequired
										/>
									)}
								</form.AppField>
								<form.AppField
									name="form.previousGivenName"
									validators={{
										onBlur: fieldValidators.previousGivenName,
										onSubmit: fieldValidators.previousGivenName,
									}}
								>
									{(field) => (
										<field.TextField
											label="First name printed on your current card"
											autoCapitalize="words"
											isRequired
										/>
									)}
								</form.AppField>
								<form.AppField name="form.previousMiddleName">
									{(field) => (
										<field.TextField
											label="Middle name printed on your current card"
											autoCapitalize="words"
										/>
									)}
								</form.AppField>
							</View>
						) : null
					}
				</form.Subscribe>
			</View>
		)
	},
})
