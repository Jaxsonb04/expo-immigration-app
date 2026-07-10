import { SectionHeading } from '@/components/core'
import { api } from '@convex/_generated/api'
import { useMutation, useQuery } from 'convex/react'
import { Button, Input, Label, Spinner, TextField, Typography } from 'heroui-native'
import { useState } from 'react'
import { Alert, View } from 'react-native'

type Draft = {
	givenName: string
	middleName: string
	familyName: string
	dateOfBirth: string
	countryOfBirth: string
	aNumber: string
	street: string
	unit: string
	city: string
	state: string
	zipCode: string
}

type SelfApplicant = NonNullable<ReturnType<typeof useSelfApplicant>>
function useSelfApplicant() {
	return useQuery(api.applicants.getSelfApplicant, {})
}

function draftFrom(self: SelfApplicant | null): Draft {
	const profile = self?.profile ?? {}
	const address = profile.mailingAddress
	return {
		givenName: profile.givenName ?? '',
		middleName: profile.middleName ?? '',
		familyName: profile.familyName ?? '',
		dateOfBirth: profile.dateOfBirth ?? '',
		countryOfBirth: profile.countryOfBirth ?? '',
		aNumber: profile.aNumber ?? '',
		street: address?.street ?? '',
		unit: address?.unit ?? '',
		city: address?.city ?? '',
		state: address?.state ?? '',
		zipCode: address?.zipCode ?? '',
	}
}

/** Omit empty strings so the shared shape's per-field rules only run on what
 * the person actually entered. */
function profileFrom(draft: Draft) {
	const text = (value: string) => (value.trim().length > 0 ? value.trim() : undefined)
	const hasAddress = [draft.street, draft.city, draft.state, draft.zipCode].some(
		(value) => value.trim().length > 0,
	)
	return {
		givenName: text(draft.givenName),
		middleName: text(draft.middleName),
		familyName: text(draft.familyName),
		dateOfBirth: text(draft.dateOfBirth),
		countryOfBirth: text(draft.countryOfBirth),
		aNumber: text(draft.aNumber),
		...(hasAddress
			? {
					mailingAddress: {
						street: draft.street.trim(),
						unit: text(draft.unit),
						city: draft.city.trim(),
						state: draft.state.trim().toUpperCase(),
						zipCode: draft.zipCode.trim(),
					},
				}
			: {}),
	}
}

function Field(props: {
	label: string
	value: string
	onChangeText: (value: string) => void
	placeholder?: string
	autoCapitalize?: 'none' | 'words' | 'characters'
	keyboardType?: 'default' | 'number-pad'
	maxLength?: number
}) {
	return (
		<TextField>
			<Label>{props.label}</Label>
			<Input
				value={props.value}
				onChangeText={props.onChangeText}
				placeholder={props.placeholder}
				autoCapitalize={props.autoCapitalize ?? 'none'}
				autoCorrect={false}
				keyboardType={props.keyboardType}
				maxLength={props.maxLength}
			/>
		</TextField>
	)
}

/**
 * Editable identity details (M6-T5), backed by the owner's SELF applicant row
 * (convex/applicants.ts) — the exact record filings prefill from, so anything
 * saved here shows up in the next interview.
 */
export function ProfileDetails() {
	const self = useSelfApplicant()
	if (self === undefined) {
		return (
			<View className="items-center py-6">
				<Spinner />
			</View>
		)
	}
	// Keyed remount prefills the form whenever a different row loads, without
	// any state-sync effect.
	return <DetailsForm key={self?._id ?? 'new'} initial={draftFrom(self)} />
}

function DetailsForm({ initial }: { initial: Draft }) {
	const updateSelfProfile = useMutation(api.applicants.updateSelfProfile)
	const [draft, setDraft] = useState<Draft>(initial)
	const [dirty, setDirty] = useState(false)
	const [saving, setSaving] = useState(false)

	const set = (key: keyof Draft) => (value: string) => {
		setDirty(true)
		setDraft((current) => ({ ...current, [key]: value }))
	}

	async function save() {
		setSaving(true)
		try {
			const profile = profileFrom(draft)
			const fullName = [profile.givenName, profile.familyName].filter(Boolean).join(' ')
			await updateSelfProfile({
				profile,
				...(fullName.length > 0 ? { displayName: fullName } : {}),
			})
			setDirty(false)
		} catch (error) {
			Alert.alert(
				"Couldn't save your details",
				error instanceof Error ? error.message : 'Please check the fields and try again.',
			)
		} finally {
			setSaving(false)
		}
	}

	return (
		<View className="gap-4">
			<View className="gap-1">
				<SectionHeading title="Your details" />
				<Typography.Paragraph color="muted" className="text-sm">
					You’re the applicant on your own filings — these details prefill every form you start.
				</Typography.Paragraph>
			</View>

			<Field label="First (given) name" value={draft.givenName} onChangeText={set('givenName')} autoCapitalize="words" />
			<Field label="Middle name" value={draft.middleName} onChangeText={set('middleName')} autoCapitalize="words" />
			<Field label="Family (last) name" value={draft.familyName} onChangeText={set('familyName')} autoCapitalize="words" />
			<Field label="Date of birth" value={draft.dateOfBirth} onChangeText={set('dateOfBirth')} placeholder="YYYY-MM-DD" keyboardType="number-pad" maxLength={10} />
			<Field label="Country of birth" value={draft.countryOfBirth} onChangeText={set('countryOfBirth')} autoCapitalize="words" />
			<Field label="A-Number (if you have one)" value={draft.aNumber} onChangeText={set('aNumber')} placeholder="7–9 digits" keyboardType="number-pad" maxLength={9} />

			<View className="gap-1 pt-1">
				<Typography.Paragraph className="font-medium">Mailing address</Typography.Paragraph>
				<Typography.Paragraph color="muted" className="text-sm">
					Where USCIS sends notices and cards.
				</Typography.Paragraph>
			</View>
			<Field label="Street address" value={draft.street} onChangeText={set('street')} autoCapitalize="words" />
			<Field label="Apt / unit (optional)" value={draft.unit} onChangeText={set('unit')} />
			<Field label="City" value={draft.city} onChangeText={set('city')} autoCapitalize="words" />
			<View className="flex-row gap-3">
				<View className="flex-1">
					<Field label="State" value={draft.state} onChangeText={set('state')} placeholder="CA" autoCapitalize="characters" maxLength={2} />
				</View>
				<View className="flex-1">
					<Field label="ZIP code" value={draft.zipCode} onChangeText={set('zipCode')} keyboardType="number-pad" maxLength={10} />
				</View>
			</View>

			<Button isDisabled={!dirty || saving} onPress={() => void save()}>
				<Button.Label>{saving ? 'Saving…' : 'Save details'}</Button.Label>
			</Button>
		</View>
	)
}
