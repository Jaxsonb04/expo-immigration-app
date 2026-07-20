import { withForm } from '@/components/form'
import { ScreeningStopNotice } from '@/components/screening-stop'
import type { ScreeningStop } from '@convex/shared/screening'
import { View } from 'react-native'
import { fieldValidators, residencyPathOptions, yesNoOptions } from '../interview.form'
import { stepBodyOptions } from './steps.options'

// A 'yes' on the proceedings/I-407 questions requires a detailed written
// explanation in Part 8 Additional Information, which this app does not
// prepare — so the step stops honestly instead of exporting an incomplete
// form. Not an eligibility judgment; an app-capability boundary.
const PART8_STOP: ScreeningStop = {
	supported: false,
	title: "This app can't prepare that answer yet",
	explanation:
		'Answering "Yes" here requires a detailed written explanation in Part 8 (Additional ' +
		'Information) of Form I-90, which this app does not prepare. Cases involving removal ' +
		'proceedings or abandonment of residence can also affect your status, so consider ' +
		'getting legal help. You can complete the official form directly.',
	officialLinks: [{ label: 'Official Form I-90 page →', url: 'https://www.uscis.gov/i-90' }],
}

/** I-90 only: Part 3 Processing Information (Items 1-5). */
export const ImmigrationHistoryStep = withForm({
	...stepBodyOptions,
	render: function Render({ form }) {
		return (
			<View className="gap-card">
				<form.AppField
					name="personFacts.locationAppliedVisa"
					validators={{
						onBlur: fieldValidators.locationAppliedVisa,
						onSubmit: fieldValidators.locationAppliedVisa,
					}}
				>
					{(field) => (
						<field.TextField
							label="Where you applied for your immigrant visa or adjustment"
							description='For example "Ciudad Juarez, Mexico" or "USCIS Chicago".'
							autoCapitalize="words"
							isRequired
						/>
					)}
				</form.AppField>
				<form.AppField
					name="personFacts.locationIssuedVisa"
					validators={{
						onBlur: fieldValidators.locationIssuedVisa,
						onSubmit: fieldValidators.locationIssuedVisa,
					}}
				>
					{(field) => (
						<field.TextField
							label="Where your visa was issued, or the USCIS office that granted adjustment"
							autoCapitalize="words"
							isRequired
						/>
					)}
				</form.AppField>
				<form.AppField
					name="personFacts.becameResidentVia"
					validators={{
						onBlur: fieldValidators.requiredChoice,
						onSubmit: fieldValidators.requiredChoice,
					}}
				>
					{(field) => (
						<field.RadioGroupField
							label="How did you become a permanent resident?"
							options={[...residencyPathOptions]}
							isRequired
						/>
					)}
				</form.AppField>
				<form.Subscribe selector={(state) => state.values.personFacts.becameResidentVia}>
					{(via) =>
						via === 'immigrantVisa' ? (
							<>
								<form.AppField
									name="personFacts.destinationAtAdmission"
									validators={{
										onBlur: fieldValidators.destinationAtAdmission,
										onSubmit: fieldValidators.destinationAtAdmission,
									}}
								>
									{(field) => (
										<field.TextField
											label="Your destination in the U.S. when you were admitted"
											autoCapitalize="words"
											isRequired
										/>
									)}
								</form.AppField>
								<form.AppField
									name="personFacts.portOfEntryCityState"
									validators={{
										onBlur: fieldValidators.portOfEntryCityState,
										onSubmit: fieldValidators.portOfEntryCityState,
									}}
								>
									{(field) => (
										<field.TextField
											label="Port of entry (city and state)"
											description='For example "San Ysidro, CA".'
											autoCapitalize="words"
											isRequired
										/>
									)}
								</form.AppField>
							</>
						) : null
					}
				</form.Subscribe>
				<form.AppField
					name="personFacts.everInProceedings"
					validators={{
						onBlur: fieldValidators.requiredChoice,
						onSubmit: fieldValidators.requiredChoice,
					}}
				>
					{(field) => (
						<field.RadioGroupField
							label="Have you ever been in exclusion, deportation, or removal proceedings, or been ordered removed from the United States?"
							options={[...yesNoOptions]}
							isRequired
						/>
					)}
				</form.AppField>
				<form.AppField
					name="personFacts.filedI407OrAbandoned"
					validators={{
						onBlur: fieldValidators.requiredChoice,
						onSubmit: fieldValidators.requiredChoice,
					}}
				>
					{(field) => (
						<field.RadioGroupField
							label="Since becoming a permanent resident, have you filed Form I-407 or otherwise been judged to have abandoned your status?"
							options={[...yesNoOptions]}
							isRequired
						/>
					)}
				</form.AppField>
				<form.Subscribe
					selector={(state) =>
						state.values.personFacts.everInProceedings === 'yes' ||
						state.values.personFacts.filedI407OrAbandoned === 'yes'
					}
				>
					{(needsPart8) => (needsPart8 ? <ScreeningStopNotice stop={PART8_STOP} /> : null)}
				</form.Subscribe>
			</View>
		)
	},
})
