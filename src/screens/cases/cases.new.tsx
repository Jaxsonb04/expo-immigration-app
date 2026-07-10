import { BodyScrollView } from '@/components/core'
import { situationLabel } from '@/lib/application-labels'
import type { Id } from '@convex/_generated/dataModel'
import { isValidReceiptNumber, normalizeReceiptNumber } from '@convex/shared/applicationShapes'
import { router } from 'expo-router'
import { Button, FieldError, Input, Label, Surface, TextField, Typography } from 'heroui-native'
import { useState } from 'react'
import { Alert, Pressable, View } from 'react-native'
import { StyledLucideIcon } from '@/components/styled-icon'
import { useCreateCase, useLinkableApplications, type LinkableApplication } from './cases.data'

function ApplicationOption(props: {
	application: LinkableApplication
	selected: boolean
	onPress: () => void
}) {
	const { application, selected, onPress } = props
	const label = situationLabel(application.formType, application.applicationKind)
	return (
		<Pressable accessibilityRole="button" onPress={onPress}>
			<Surface
				variant={selected ? 'default' : 'secondary'}
				className="flex-row items-center gap-3 rounded-xl p-3"
			>
				<StyledLucideIcon
					name={selected ? 'circle-check' : 'circle'}
					size={20}
					className={selected ? 'text-accent' : 'text-muted'}
				/>
				<View className="flex-1">
					<Typography.Paragraph className="font-medium">{label.primary}</Typography.Paragraph>
					<Typography.Paragraph color="muted" className="text-sm">
						{application.applicantName}
					</Typography.Paragraph>
				</View>
			</Surface>
		</Pressable>
	)
}

/** Create-case modal (M3-T2): enter a USCIS receipt number and optionally link
 * a filed application, then track it. */
export function NewCaseScreen() {
	const createCase = useCreateCase()
	const applications = useLinkableApplications()
	const [receipt, setReceipt] = useState('')
	const [linkedId, setLinkedId] = useState<Id<'applications'> | null>(null)
	const [showError, setShowError] = useState(false)
	const [busy, setBusy] = useState(false)

	const normalized = normalizeReceiptNumber(receipt)
	const isValid = isValidReceiptNumber(normalized)

	async function submit() {
		if (!isValid) {
			setShowError(true)
			return
		}
		setBusy(true)
		try {
			await createCase({ receiptNumber: normalized, applicationId: linkedId ?? undefined })
			router.back()
		} catch (error) {
			Alert.alert(
				'Could not add case',
				error instanceof Error ? error.message : 'Please try again.',
			)
		} finally {
			setBusy(false)
		}
	}

	return (
		<BodyScrollView contentContainerClassName="gap-6 py-5">
			<View className="gap-1">
				<Typography.Paragraph color="muted">
					Add the USCIS receipt number from your filing notice to follow its status and timeline.
				</Typography.Paragraph>
			</View>

			<TextField isInvalid={showError && !isValid}>
				<Label>USCIS receipt number</Label>
				<Input
					value={receipt}
					onChangeText={(value) => {
						setReceipt(value)
						if (showError) setShowError(false)
					}}
					placeholder="e.g. EAC1234567890"
					autoCapitalize="characters"
					autoCorrect={false}
				/>
				{showError && !isValid ? (
					<FieldError>Enter a receipt number like EAC1234567890 — 3 letters and 10 digits.</FieldError>
				) : null}
			</TextField>

			{applications && applications.length > 0 ? (
				<View className="gap-2">
					<Typography.Heading className="text-base font-semibold">
						Link a filed application (optional)
					</Typography.Heading>
					{applications.map((application) => (
						<ApplicationOption
							key={application._id}
							application={application}
							selected={linkedId === application._id}
							onPress={() =>
								setLinkedId((current) => (current === application._id ? null : application._id))
							}
						/>
					))}
				</View>
			) : null}

			<Button isDisabled={busy || normalized.length === 0} onPress={submit}>
				<Button.Label>{busy ? 'Adding…' : 'Track this case'}</Button.Label>
			</Button>
		</BodyScrollView>
	)
}
