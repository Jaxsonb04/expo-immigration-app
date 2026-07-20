import { withForm } from '@/components/form'
import { View } from 'react-native'
import { fieldValidators, yesNoOptions } from '../interview.form'
import { stepBodyOptions } from './steps.options'

export const MailingAddressStep = withForm({
	...stepBodyOptions,
	render: function Render({ form, formType }) {
		return (
			<View className="gap-card">
				<form.AppField
					name="personFacts.mailingAddress.street"
					validators={{ onBlur: fieldValidators.street, onSubmit: fieldValidators.street }}
				>
					{(field) => (
						<field.TextField
							label="Street address"
							autoCapitalize="words"
							isRequired
							focusNextOnSubmit
						/>
					)}
				</form.AppField>
				<form.AppField name="personFacts.mailingAddress.unit">
					{(field) => (
						<field.TextField
							label="Apartment / unit"
							autoCapitalize="characters"
							focusNextOnSubmit
						/>
					)}
				</form.AppField>
				<form.AppField
					name="personFacts.mailingAddress.city"
					validators={{ onBlur: fieldValidators.city, onSubmit: fieldValidators.city }}
				>
					{(field) => (
						<field.TextField label="City" autoCapitalize="words" isRequired focusNextOnSubmit />
					)}
				</form.AppField>
				<View className="flex-row gap-control">
					<View className="flex-1">
						<form.AppField
							name="personFacts.mailingAddress.state"
							validators={{ onBlur: fieldValidators.state, onSubmit: fieldValidators.state }}
						>
							{(field) => (
								<field.TextField
									label="State"
									autoCapitalize="characters"
									maxLength={2}
									isRequired
									focusNextOnSubmit
								/>
							)}
						</form.AppField>
					</View>
					<View className="flex-1">
						<form.AppField
							name="personFacts.mailingAddress.zipCode"
							validators={{ onBlur: fieldValidators.zipCode, onSubmit: fieldValidators.zipCode }}
						>
							{(field) => (
								<field.TextField label="ZIP" keyboardType="number-pad" maxLength={10} isRequired />
							)}
						</form.AppField>
					</View>
				</View>

				{/* Both forms ask whether this is also where the applicant lives
				    (I-765 Item 6 / I-90 Item 7): the physical address is provided
				    only when different. Commuters (I-90) normally live abroad, so
				    the foreign fields render for that form only — the I-765's
				    Item 7 is strictly a U.S. address. */}
				{
					<>
						<form.AppField
							name="form.physicalAddressSameAsMailing"
							validators={{
								onBlur: fieldValidators.requiredChoice,
								onSubmit: fieldValidators.requiredChoice,
							}}
						>
							{(field) => (
								<field.RadioGroupField
									label="Do you physically live at this mailing address?"
									options={[...yesNoOptions]}
									isRequired
								/>
							)}
						</form.AppField>
						<form.Subscribe selector={(state) => state.values.form.physicalAddressSameAsMailing}>
							{(same) =>
								same === 'no' ? (
									<View className="gap-card">
										<form.AppField
											name="form.physicalAddress.street"
											validators={{
												onBlur: fieldValidators.physicalStreet,
												onSubmit: fieldValidators.physicalStreet,
											}}
										>
											{(field) => (
												<field.TextField
													label="Physical street address"
													autoCapitalize="words"
													isRequired
												/>
											)}
										</form.AppField>
										<form.AppField name="form.physicalAddress.unit">
											{(field) => (
												<field.TextField label="Apartment / unit" autoCapitalize="characters" />
											)}
										</form.AppField>
										<form.AppField
											name="form.physicalAddress.city"
											validators={{
												onBlur: fieldValidators.physicalCity,
												onSubmit: fieldValidators.physicalCity,
											}}
										>
											{(field) => (
												<field.TextField label="City or town" autoCapitalize="words" isRequired />
											)}
										</form.AppField>
										<View className="flex-row gap-control">
											<View className="flex-1">
												<form.AppField
													name="form.physicalAddress.state"
													// The I-765's Item 7 is a U.S.-only address, so its
													// state/ZIP are required; the I-90 allows a foreign
													// address instead (country cross-validator below).
													validators={
														formType === 'i765'
															? {
																	onBlur: fieldValidators.state,
																	onSubmit: fieldValidators.state,
																}
															: undefined
													}
												>
													{(field) => (
														<field.TextField
															label="State (U.S.)"
															autoCapitalize="characters"
															maxLength={2}
															isRequired={formType === 'i765'}
														/>
													)}
												</form.AppField>
											</View>
											<View className="flex-1">
												<form.AppField
													name="form.physicalAddress.zipCode"
													validators={
														formType === 'i765'
															? {
																	onBlur: fieldValidators.zipCode,
																	onSubmit: fieldValidators.zipCode,
																}
															: undefined
													}
												>
													{(field) => (
														<field.TextField
															label="ZIP (U.S.)"
															keyboardType="number-pad"
															maxLength={10}
															isRequired={formType === 'i765'}
														/>
													)}
												</form.AppField>
											</View>
										</View>
										{formType === 'i90' && (
											<View className="flex-row gap-control">
												<View className="flex-1">
													<form.AppField name="form.physicalAddress.province">
														{(field) => (
															<field.TextField
																label="Province (if abroad)"
																autoCapitalize="words"
															/>
														)}
													</form.AppField>
												</View>
												<View className="flex-1">
													<form.AppField name="form.physicalAddress.postalCode">
														{(field) => <field.TextField label="Postal code (if abroad)" />}
													</form.AppField>
												</View>
											</View>
										)}
										{formType === 'i90' && (
											<form.AppField
												name="form.physicalAddress.country"
												validators={{
													// Cross-field: a U.S. state+ZIP or a country is required.
													onChangeListenTo: [
														'form.physicalAddress.state',
														'form.physicalAddress.zipCode',
													],
													onChange: ({ value, fieldApi }) => {
														const state = fieldApi.form.getFieldValue('form.physicalAddress.state')
														const zip = fieldApi.form.getFieldValue('form.physicalAddress.zipCode')
														const hasUs = state.trim() !== '' && zip.trim() !== ''
														return hasUs || value.trim() !== ''
															? undefined
															: 'Enter a U.S. state and ZIP, or a country'
													},
												}}
											>
												{(field) => (
													<field.TextField
														label="Country (if abroad)"
														description="Leave blank for a U.S. address."
														autoCapitalize="words"
													/>
												)}
											</form.AppField>
										)}
									</View>
								) : null
							}
						</form.Subscribe>
					</>
				}
			</View>
		)
	},
})
