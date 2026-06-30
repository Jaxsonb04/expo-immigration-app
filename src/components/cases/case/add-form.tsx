import { useAppForm } from '@/components/form'
import { useToast } from 'heroui-native'
import { Alert, View } from 'react-native'
import { useCreateCase } from '../cases.data'
import { CASE_STATUS_OPTIONS, type CaseStatusOption, receiptFormSchema } from '../cases.schema'

const STATUS_OPTIONS = CASE_STATUS_OPTIONS.map((status) => ({ value: status, label: status }))

/**
 * Inline receipt-entry form (ADR-0008: manual entry in v1). Validates the USCIS
 * Receipt Number format with the shared Zod schema, then creates a Case seeded
 * with the chosen current status. Calls `onAdded` after a successful create.
 */
export function AddCaseForm({ onAdded }: { onAdded?: () => void }) {
	const createCase = useCreateCase()
	const { toast } = useToast()

	const form = useAppForm({
		defaultValues: {
			receiptNumber: '',
			initialStatus: 'Case Received' as CaseStatusOption,
		},
		validators: { onSubmit: receiptFormSchema },
		onSubmit: async ({ value }) => {
			try {
				await createCase({
					receiptNumber: value.receiptNumber,
					initialStatus: value.initialStatus,
				})
				form.reset()
				toast.show({ label: 'Case added', variant: 'success', placement: 'bottom' })
				onAdded?.()
			} catch (err) {
				Alert.alert('Could not add case', err instanceof Error ? err.message : 'Please try again.')
			}
		},
	})

	return (
		<form.AppForm>
			<View className="gap-4">
				<form.AppField name="receiptNumber">
					{(field) => (
						<field.TextField
							label="Receipt Number"
							placeholder="IOE1234567890"
							autoCapitalize="characters"
							autoCorrect={false}
							description="On your I-797 receipt notice — 3 letters then 10 digits."
						/>
					)}
				</form.AppField>
				<form.AppField name="initialStatus">
					{(field) => (
						<field.SelectField
							label="Current status"
							options={STATUS_OPTIONS}
							description="The latest status shown on USCIS for this case."
						/>
					)}
				</form.AppField>
				<form.SubmitButton label="Track case" />
			</View>
		</form.AppForm>
	)
}
