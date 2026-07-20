import { withForm } from '@/components/form'
import { Typography } from 'heroui-native'
import { View } from 'react-native'
import { fieldValidators, yesNoOptions } from '../interview.form'
import { stepBodyOptions } from './steps.options'

const OTHER_NAME_ROWS = [0, 1, 2] as const

export const LegalNameStep = withForm({
	...stepBodyOptions,
	render: function Render({ form, formType }) {
		return (
			<View className="gap-card">
				<form.AppField
					name="personFacts.givenName"
					validators={{ onBlur: fieldValidators.givenName, onSubmit: fieldValidators.givenName }}
				>
					{(field) => (
						<field.TextField
							label="First (given) name"
							autoCapitalize="words"
							isRequired
							focusNextOnSubmit
						/>
					)}
				</form.AppField>
				<form.AppField name="personFacts.middleName">
					{(field) => (
						<field.TextField label="Middle name" autoCapitalize="words" focusNextOnSubmit />
					)}
				</form.AppField>
				<form.AppField
					name="personFacts.familyName"
					validators={{ onBlur: fieldValidators.familyName, onSubmit: fieldValidators.familyName }}
				>
					{(field) => (
						<field.TextField label="Family (last) name" autoCapitalize="words" isRequired />
					)}
				</form.AppField>

				{/* I-765 Items 2-3: the printed form requires an answer about other
				    names ever used (aliases, maiden names, nicknames) — or N/A,
				    which the app writes when the answer is No. */}
				{formType === 'i765' && (
					<>
						<form.AppField
							name="personFacts.hasUsedOtherNames"
							validators={{
								onBlur: fieldValidators.requiredChoice,
								onSubmit: fieldValidators.requiredChoice,
							}}
						>
							{(field) => (
								<field.RadioGroupField
									label="Have you ever used any other names?"
									description="Aliases, maiden names, and nicknames all count."
									options={[...yesNoOptions]}
									isRequired
								/>
							)}
						</form.AppField>
						<form.Subscribe selector={(state) => state.values.personFacts.hasUsedOtherNames}>
							{(answer) =>
								answer === 'yes' ? (
									<View className="gap-card">
										{OTHER_NAME_ROWS.map((row) => (
											<View key={row} className="gap-tight">
												<Typography.Paragraph color="muted" className="text-xs font-medium">
													{row === 0 ? 'Other name' : `Other name ${row + 1} (optional)`}
												</Typography.Paragraph>
												<form.AppField
													name={`personFacts.otherNames[${row}].familyName`}
													validators={
														row === 0
															? {
																	onBlur: fieldValidators.otherNameFamily,
																	onSubmit: fieldValidators.otherNameFamily,
																}
															: {
																	// Optional row, but a partially filled one
																	// needs both names (the server rejects it).
																	onChangeListenTo: [
																		`personFacts.otherNames[${row}].givenName`,
																		`personFacts.otherNames[${row}].middleName`,
																	],
																	onChange: ({ value, fieldApi }) => {
																		const given = fieldApi.form.getFieldValue(
																			`personFacts.otherNames[${row}].givenName`,
																		)
																		const middle = fieldApi.form.getFieldValue(
																			`personFacts.otherNames[${row}].middleName`,
																		)
																		const touched =
																			value.trim() !== '' ||
																			given.trim() !== '' ||
																			middle.trim() !== ''
																		return touched && value.trim() === ''
																			? 'Family name is required'
																			: undefined
																	},
																}
													}
												>
													{(field) => (
														<field.TextField
															label="Family (last) name"
															autoCapitalize="words"
															isRequired={row === 0}
														/>
													)}
												</form.AppField>
												<form.AppField
													name={`personFacts.otherNames[${row}].givenName`}
													validators={
														row === 0
															? {
																	onBlur: fieldValidators.otherNameGiven,
																	onSubmit: fieldValidators.otherNameGiven,
																}
															: {
																	onChangeListenTo: [
																		`personFacts.otherNames[${row}].familyName`,
																		`personFacts.otherNames[${row}].middleName`,
																	],
																	onChange: ({ value, fieldApi }) => {
																		const family = fieldApi.form.getFieldValue(
																			`personFacts.otherNames[${row}].familyName`,
																		)
																		const middle = fieldApi.form.getFieldValue(
																			`personFacts.otherNames[${row}].middleName`,
																		)
																		const touched =
																			value.trim() !== '' ||
																			family.trim() !== '' ||
																			middle.trim() !== ''
																		return touched && value.trim() === ''
																			? 'First name is required'
																			: undefined
																	},
																}
													}
												>
													{(field) => (
														<field.TextField
															label="First (given) name"
															autoCapitalize="words"
															isRequired={row === 0}
														/>
													)}
												</form.AppField>
												<form.AppField name={`personFacts.otherNames[${row}].middleName`}>
													{(field) => (
														<field.TextField label="Middle name" autoCapitalize="words" />
													)}
												</form.AppField>
											</View>
										))}
									</View>
								) : null
							}
						</form.Subscribe>
					</>
				)}
			</View>
		)
	},
})
