import { View } from 'react-native'
import { withFieldGroup } from './form'

/**
 * A reusable US-address section. Because it is a field group, the same component
 * binds to any object field of shape `{ line1, city, state, postalCode }` on a
 * parent form — e.g. `<AddressFieldGroup form={form} fields="mailingAddress" />`
 * — so address sections can be reused across forms (mailing, physical, etc.).
 */
export const AddressFieldGroup = withFieldGroup({
	defaultValues: { line1: '', city: '', state: '', postalCode: '' },
	render: function AddressFieldGroupRender({ group }) {
		return (
			<View className="gap-4">
				<group.AppField name="line1">
					{(field) => (
						<field.TextField label="Street address" autoCapitalize="words" focusNextOnSubmit />
					)}
				</group.AppField>
				<group.AppField name="city">
					{(field) => <field.TextField label="City" autoCapitalize="words" focusNextOnSubmit />}
				</group.AppField>
				<View className="flex-row gap-3">
					<View className="flex-1">
						<group.AppField name="state">
							{(field) => (
								<field.TextField
									label="State"
									autoCapitalize="characters"
									maxLength={2}
									focusNextOnSubmit
								/>
							)}
						</group.AppField>
					</View>
					<View className="flex-1">
						{/* ZIP is the last address field and uses a number-pad (no return key),
						    so it does NOT advance focus — avoids the floating "Next" accessory. */}
						<group.AppField name="postalCode">
							{(field) => <field.TextField label="ZIP" keyboardType="number-pad" maxLength={10} />}
						</group.AppField>
					</View>
				</View>
			</View>
		)
	},
})
