import { withForm } from '@/components/form'
import { View } from 'react-native'
import { fieldValidators } from '../interview.form'
import { stepBodyOptions } from './steps.options'

/** Both forms: the USCIS applicant contact block (I-765 Part 3 / I-90 Part 5). */
export const ContactInfoStep = withForm({
	...stepBodyOptions,
	render: function Render({ form }) {
		return (
			<View className="gap-card">
				<form.AppField
					name="personFacts.daytimePhone"
					validators={{
						onBlur: fieldValidators.daytimePhone,
						onSubmit: fieldValidators.daytimePhone,
					}}
				>
					{(field) => (
						<field.TextField
							label="Daytime phone number"
							description="A 10-digit U.S. number you answer during the day."
							keyboardType="phone-pad"
							isRequired
						/>
					)}
				</form.AppField>
				<form.AppField
					name="personFacts.email"
					validators={{ onBlur: fieldValidators.email, onSubmit: fieldValidators.email }}
				>
					{(field) => (
						<field.TextField
							label="Email address"
							description="Optional, but recommended — USCIS offers e-notification."
							keyboardType="email-address"
							autoCapitalize="none"
						/>
					)}
				</form.AppField>
			</View>
		)
	},
})
