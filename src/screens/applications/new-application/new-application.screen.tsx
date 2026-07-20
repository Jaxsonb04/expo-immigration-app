import { BodyScrollView } from '@/components/core'
import { useAppForm, type RadioGroupFieldOption } from '@/components/form'
import { situationLabel } from '@/lib/application-labels'
import { useLocalSearchParams } from 'expo-router'
import { Spinner } from 'heroui-native'
import { Alert, View } from 'react-native'
import { NewApplication } from './new-application'
import {
	NEW_DEPENDENT_CHOICE,
	SELF_CHOICE,
	situationKey,
	situationKeyFromParams,
	supportedSituations,
	useNewApplicationSubmit,
} from './new-application.data'
import { newApplicationFormOptions } from './new-application.form'

export function NewApplicationScreen() {
	const { applicants, selfApplicant, dependents, submit } = useNewApplicationSubmit()

	// M1-T4: the assistant's "Start this form" handoff deep-links here with the
	// recommended form/kind. Preselect the situation only if the params name a
	// supported combo; the user still confirms the applicant and submits.
	const params = useLocalSearchParams<{ formType?: string; applicationKind?: string }>()
	const presetSituationKey = situationKeyFromParams(params.formType, params.applicationKind)

	const form = useAppForm({
		...newApplicationFormOptions,
		defaultValues: { ...newApplicationFormOptions.defaultValues, situationKey: presetSituationKey },
		onSubmit: async ({ value }) => {
			try {
				await submit(value)
			} catch (error) {
				Alert.alert(
					"Couldn't start the application",
					error instanceof Error ? error.message : 'Please try again.',
				)
			}
		},
	})

	if (applicants === undefined) {
		return (
			<View className="flex-1 items-center justify-center bg-background">
				<Spinner />
			</View>
		)
	}

	const applicantOptions: RadioGroupFieldOption[] = [
		{ value: SELF_CHOICE, label: selfApplicant?.displayName ?? 'Myself' },
		...dependents.map((applicant) => ({ value: applicant._id, label: applicant.displayName })),
		{ value: NEW_DEPENDENT_CHOICE, label: 'Someone else', description: 'Add a family member' },
	]

	const situationOptions: RadioGroupFieldOption[] = supportedSituations.map((situation) => {
		const label = situationLabel(situation.formType, situation.applicationKind)
		return { value: situationKey(situation), label: label.primary, description: label.secondary }
	})

	return (
		<BodyScrollView contentContainerClassName="py-gutter gap-section">
			<NewApplication.Header />
			<NewApplication.ApplicantField form={form} options={applicantOptions} />
			<NewApplication.DependentNameField form={form} />
			<NewApplication.SituationField form={form} options={situationOptions} />
			<NewApplication.CardStatusField form={form} />
			<NewApplication.Submit form={form} />
		</BodyScrollView>
	)
}
