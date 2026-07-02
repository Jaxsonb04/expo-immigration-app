import { withForm } from '@/components/form'
import { View } from 'react-native'
import { fieldValidators } from '../interview.form'
import { stepBodyOptions } from './steps.options'

export const MailingAddressStep = withForm({
	...stepBodyOptions,
	render: function Render({ form }) {
		return (
			<View className="gap-4">
				<form.AppField
					name="personFacts.mailingAddress.street"
					validators={{ onBlur: fieldValidators.street, onSubmit: fieldValidators.street }}
				>
					{(field) => (
						<field.TextField label="Street address" autoCapitalize="words" isRequired focusNextOnSubmit />
					)}
				</form.AppField>
				<form.AppField name="personFacts.mailingAddress.unit">
					{(field) => (
						<field.TextField label="Apartment / unit" autoCapitalize="characters" focusNextOnSubmit />
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
				<View className="flex-row gap-3">
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
			</View>
		)
	},
})
