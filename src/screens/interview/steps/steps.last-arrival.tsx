import { withForm } from '@/components/form'
import { View } from 'react-native'
import { fieldValidators, yesNoOptions } from '../interview.form'
import { stepBodyOptions } from './steps.options'

/** I-765 only: Part 2 Items 17-26, Information About Your Last Arrival. */
export const LastArrivalStep = withForm({
	...stepBodyOptions,
	render: function Render({ form }) {
		return (
			<View className="gap-card">
				<form.AppField
					name="personFacts.dateOfLastEntry"
					validators={{
						onBlur: fieldValidators.dateOfLastEntry,
						onSubmit: fieldValidators.dateOfLastEntry,
					}}
				>
					{(field) => <field.DateField label="Date of your last entry into the U.S." isRequired />}
				</form.AppField>
				<form.AppField
					name="personFacts.placeOfLastEntry"
					validators={{
						onBlur: fieldValidators.placeOfLastEntry,
						onSubmit: fieldValidators.placeOfLastEntry,
					}}
				>
					{(field) => (
						<field.TextField
							label="Place of your last arrival"
							description='For example "San Ysidro, CA" or "JFK Airport, New York".'
							autoCapitalize="words"
							isRequired
						/>
					)}
				</form.AppField>
				<form.AppField
					name="personFacts.statusAtLastEntry"
					validators={{
						onBlur: fieldValidators.statusAtLastEntry,
						onSubmit: fieldValidators.statusAtLastEntry,
					}}
				>
					{(field) => (
						<field.TextField
							label="Your immigration status at that arrival"
							description='For example "B-2 visitor", "F-1 student", or "no status".'
							isRequired
						/>
					)}
				</form.AppField>
				<form.AppField
					name="personFacts.currentImmigrationStatus"
					validators={{
						onBlur: fieldValidators.currentImmigrationStatus,
						onSubmit: fieldValidators.currentImmigrationStatus,
					}}
				>
					{(field) => (
						<field.TextField
							label="Your current immigration status or category"
							description='For example "F-1 student", "parolee", "deferred action", or "no status".'
							isRequired
						/>
					)}
				</form.AppField>
				<form.AppField
					name="personFacts.i94Number"
					validators={{ onBlur: fieldValidators.i94Number, onSubmit: fieldValidators.i94Number }}
				>
					{(field) => (
						<field.TextField
							label="I-94 number"
							description="Only if CBP or USCIS issued you one — look it up at cbp.gov/i94. Leave blank otherwise."
							autoCapitalize="characters"
							maxLength={11}
						/>
					)}
				</form.AppField>
				<form.AppField
					name="personFacts.usedTravelDocument"
					validators={{
						onBlur: fieldValidators.requiredChoice,
						onSubmit: fieldValidators.requiredChoice,
					}}
				>
					{(field) => (
						<field.RadioGroupField
							label="Did you use a passport or travel document to travel to the U.S.?"
							options={[...yesNoOptions]}
							isRequired
						/>
					)}
				</form.AppField>
				<form.Subscribe selector={(state) => state.values.personFacts.usedTravelDocument}>
					{(used) =>
						used === 'yes' ? (
							<View className="gap-card">
								<form.AppField
									name="personFacts.passportNumber"
									validators={{
										// Pair rule: at least one of passport / travel-doc number.
										onChangeListenTo: ['personFacts.travelDocNumber'],
										onChange: ({ value, fieldApi }) => {
											const other = fieldApi.form.getFieldValue('personFacts.travelDocNumber')
											return value.trim() !== '' || other.trim() !== ''
												? undefined
												: 'Enter a passport or travel document number'
										},
									}}
								>
									{(field) => (
										<field.TextField
											label="Passport number"
											description="Your most recently issued passport, even if it has expired."
											autoCapitalize="characters"
										/>
									)}
								</form.AppField>
								<form.AppField name="personFacts.travelDocNumber">
									{(field) => (
										<field.TextField
											label="Travel document number"
											description="Only if you used a travel document instead of a passport."
											autoCapitalize="characters"
										/>
									)}
								</form.AppField>
								<form.AppField
									name="personFacts.travelDocCountryOfIssuance"
									validators={{
										onBlur: fieldValidators.travelDocCountryOfIssuance,
										onSubmit: fieldValidators.travelDocCountryOfIssuance,
									}}
								>
									{(field) => (
										<field.TextField
											label="Country that issued it"
											autoCapitalize="words"
											isRequired
										/>
									)}
								</form.AppField>
								<form.AppField
									name="personFacts.travelDocExpirationDate"
									validators={{
										onBlur: fieldValidators.travelDocExpirationDate,
										onSubmit: fieldValidators.travelDocExpirationDate,
									}}
								>
									{(field) => <field.DateField label="Its expiration date" isRequired />}
								</form.AppField>
							</View>
						) : null
					}
				</form.Subscribe>
				<form.AppField
					name="personFacts.sevisNumber"
					validators={{
						onBlur: fieldValidators.sevisNumber,
						onSubmit: fieldValidators.sevisNumber,
					}}
				>
					{(field) => (
						<field.TextField
							label="SEVIS number"
							description="Students and exchange visitors only — leave blank otherwise."
							autoCapitalize="characters"
							maxLength={11}
						/>
					)}
				</form.AppField>
			</View>
		)
	},
})
