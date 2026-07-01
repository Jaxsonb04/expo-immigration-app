import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import type { ApplicationKind, FormType } from '@convex/shared/applicationShapes'
import { supportedSituations } from '@convex/shared/applicationShapes'
import { useMutation, useQuery } from 'convex/react'
import { useRouter } from 'expo-router'
import type { NewApplicationValues } from './new-application.form'

export type Situation = { formType: FormType; applicationKind: ApplicationKind }

/** Radio value for "Myself" — the self applicant row may not exist yet (decision 3). */
export const SELF_CHOICE = 'self'
/** Radio value for "Someone else" — creates a dependent applicant on submit. */
export const NEW_DEPENDENT_CHOICE = 'new'

export function situationKey(situation: Situation): string {
	return `${situation.formType}:${situation.applicationKind}`
}

export function parseSituationKey(key: string): Situation {
	const found = supportedSituations.find((s) => situationKey(s) === key)
	if (found === undefined) throw new Error('Choose what you need to do')
	return found
}

export { supportedSituations }

export function useNewApplicationSubmit() {
	const router = useRouter()
	const applicants = useQuery(api.applicants.listApplicants, {})
	const createApplicant = useMutation(api.applicants.createApplicant)
	const createApplication = useMutation(api.applications.createApplication)

	const selfApplicant = applicants?.find((a) => a.isSelf)
	const dependents = applicants?.filter((a) => !a.isSelf) ?? []

	async function submit(values: NewApplicationValues): Promise<void> {
		const situation = parseSituationKey(values.situationKey)

		let applicantId: Id<'applicants'>
		if (values.applicantChoice === SELF_CHOICE) {
			// Lazy self row: reuse if it exists, create on first use. The real
			// name arrives via person-fact promotion at Review (ADR-0014).
			applicantId =
				selfApplicant?._id ?? (await createApplicant({ displayName: 'Me', isSelf: true }))
		} else if (values.applicantChoice === NEW_DEPENDENT_CHOICE) {
			const displayName = values.dependentName.trim()
			if (displayName.length === 0) throw new Error("Enter the person's name")
			applicantId = await createApplicant({ displayName, isSelf: false })
		} else {
			applicantId = values.applicantChoice as Id<'applicants'>
		}

		const applicationId = await createApplication({ applicantId, ...situation })
		router.dismiss()
		router.push(`/application/${applicationId}`)
	}

	return { applicants, selfApplicant, dependents, submit }
}
