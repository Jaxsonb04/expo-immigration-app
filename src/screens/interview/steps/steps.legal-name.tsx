import { withForm } from '@/components/form'
import { View } from 'react-native'
import { fieldValidators } from '../interview.form'
import { stepBodyOptions } from './steps.options'

export const LegalNameStep = withForm({
	...stepBodyOptions,
	render: function Render({ form }) {
		return (
			<View className="gap-4">
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
					{(field) => <field.TextField label="Family (last) name" autoCapitalize="words" isRequired />}
				</form.AppField>
			</View>
		)
	},
})
