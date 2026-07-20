import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import type { I90CardStatus } from '@convex/shared/applicationShapes'
import { isI90CardStatus, screenI90 } from '@convex/shared/screening'
import { useMutation, useQuery } from 'convex/react'
import { useRouter } from 'expo-router'
import type { NewApplicationValues } from './new-application.form'
import { NEW_DEPENDENT_CHOICE, parseSituationKey, SELF_CHOICE } from './new-application.situations'

// Pure situation helpers (situationKey, parseSituationKey, situationKeyFromParams,
// the choice constants, supportedSituations) live in new-application.situations.ts
// and are re-exported here so existing importers keep their './new-application.data'
// import path.
export * from './new-application.situations'

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

		// I-90 pre-screen (shared/screening.ts): the same rule the server
		// enforces, checked here so the user gets the honest stop copy instead
		// of a raw mutation error. Alerts fall back to the server message.
		let i90CardStatus: I90CardStatus | undefined
		if (situation.formType === 'i90') {
			if (!isI90CardStatus(values.i90CardStatus)) {
				throw new Error('Choose what kind of card you have')
			}
			const screening = screenI90(values.i90CardStatus, situation.applicationKind)
			if (!screening.supported) {
				throw new Error(`${screening.title}. ${screening.explanation}`)
			}
			i90CardStatus = values.i90CardStatus
		}

		const applicationId = await createApplication({ applicantId, ...situation, i90CardStatus })
		router.dismiss()
		router.push(`/application/${applicationId}`)
	}

	return { applicants, selfApplicant, dependents, submit }
}
