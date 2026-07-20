import { withForm } from '@/components/form'
import { ScreeningStopNotice } from '@/components/screening-stop'
import type { ScreeningStop } from '@convex/shared/screening'
import { View } from 'react-native'
import { fieldValidators, yesNoOptions } from '../interview.form'
import { stepBodyOptions } from './steps.options'

// Part 5 statement 1.B (interpreter) and Item 2 (preparer) require Parts 6/7,
// which this app does not prepare — honest stop rather than a false 1.A check.
const INTERPRETER_STOP: ScreeningStop = {
	supported: false,
	title: "This app can't prepare interpreter or preparer sections yet",
	explanation:
		'If an interpreter read the application to you, or someone else prepared it for you, the ' +
		'official form requires their details and signatures in Parts 6 and 7 — sections this ' +
		'app does not prepare. You can complete the official form directly.',
	officialLinks: [{ label: 'Official Form I-90 page →', url: 'https://www.uscis.gov/i-90' }],
}

/** I-90 only: Part 5 Applicant's Statement + Part 4 Accommodations. */
export const ApplicantStatementStep = withForm({
	...stepBodyOptions,
	render: function Render({ form }) {
		return (
			<View className="gap-card">
				<form.AppField
					name="form.preparedSelfInEnglish"
					validators={{
						onBlur: fieldValidators.requiredChoice,
						onSubmit: fieldValidators.requiredChoice,
					}}
				>
					{(field) => (
						<field.RadioGroupField
							label="Did you read and answer this application yourself, in English?"
							description="The printed form makes you declare this before signing."
							options={[...yesNoOptions]}
							isRequired
						/>
					)}
				</form.AppField>
				<form.Subscribe selector={(state) => state.values.form.preparedSelfInEnglish}>
					{(answer) => (answer === 'no' ? <ScreeningStopNotice stop={INTERPRETER_STOP} /> : null)}
				</form.Subscribe>
				<form.AppField
					name="form.requestingAccommodation"
					validators={{
						onBlur: fieldValidators.requiredChoice,
						onSubmit: fieldValidators.requiredChoice,
					}}
				>
					{(field) => (
						<field.RadioGroupField
							label="Are you requesting an accommodation because of a disability or impairment?"
							description="USCIS can accommodate appointments (for example a sign-language interpreter)."
							options={[...yesNoOptions]}
							isRequired
						/>
					)}
				</form.AppField>
				<form.Subscribe selector={(state) => state.values.form.requestingAccommodation}>
					{(requesting) =>
						requesting === 'yes' ? (
							<View className="gap-card">
								<form.AppField
									name="form.accommodationDeafSignLanguage"
									validators={{
										// Cross-field: when requesting an accommodation, at least
										// one of the three boxes must carry detail text.
										onChangeListenTo: [
											'form.requestingAccommodation',
											'form.accommodationBlindDetail',
											'form.accommodationOtherDetail',
										],
										onChange: ({ value, fieldApi }) => {
											if (fieldApi.form.getFieldValue('form.requestingAccommodation') !== 'yes') {
												return undefined
											}
											const anyDetail =
												value.trim() !== '' ||
												fieldApi.form.getFieldValue('form.accommodationBlindDetail').trim() !== '' ||
												fieldApi.form.getFieldValue('form.accommodationOtherDetail').trim() !== ''
											return anyDetail ? undefined : 'Describe at least one accommodation below'
										},
									}}
								>
									{(field) => (
										<field.TextField
											label="I am deaf or hard of hearing"
											description="Enter the accommodation you need (for a sign-language interpreter, name the language, e.g. American Sign Language). Leave blank if this doesn't apply."
										/>
									)}
								</form.AppField>
								<form.AppField name="form.accommodationBlindDetail">
									{(field) => (
										<field.TextField
											label="I am blind or have low vision"
											description="Enter the accommodation you need. Leave blank if this doesn't apply."
										/>
									)}
								</form.AppField>
								<form.AppField name="form.accommodationOtherDetail">
									{(field) => (
										<field.TextField
											label="Another disability or impairment"
											description="Describe the disability/impairment and the accommodation you need. Leave blank if this doesn't apply."
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
