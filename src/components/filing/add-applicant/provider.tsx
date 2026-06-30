import {
	useCreateApplicant,
	useUpdateApplicantProfile,
} from '@/components/applicants/applicants.data'
import { useAppForm } from '@/components/form'
import { revalidateLogic } from '@tanstack/react-form'
import { router } from 'expo-router'
import { createContext, useContext, type ReactNode } from 'react'
import { Alert } from 'react-native'
import { addApplicantFormOpts, addApplicantFullSchema, toApplicantDraft } from './wizard-form'

/**
 * Owns the single `useAppForm` for the add-applicant Interview (ADR-0013) plus
 * the save side effect. Mounted once at the route layout so every step *page*
 * shares one form instance through context: steps read `useAddApplicantForm()`
 * instead of receiving `form`/navigation props, and answers persist across the
 * push/pop step navigation because the provider outlives each step screen.
 */
function useAddApplicantFormInstance() {
	const createApplicant = useCreateApplicant()
	const updateProfile = useUpdateApplicantProfile()

	return useAppForm({
		...addApplicantFormOpts,
		validationLogic: revalidateLogic(),
		validators: { onDynamic: addApplicantFullSchema },
		onSubmit: async ({ value }) => {
			try {
				const draft = toApplicantDraft(value)
				const applicantId = await createApplicant({
					displayName: draft.displayName,
					relationship: 'self',
				})
				await updateProfile({ applicantId, profile: draft.profile })
				router.dismissAll()
			} catch (err) {
				Alert.alert('Could not save', err instanceof Error ? err.message : 'Please try again.')
			}
		},
	})
}

type AddApplicantForm = ReturnType<typeof useAddApplicantFormInstance>

const AddApplicantContext = createContext<AddApplicantForm | null>(null)

export function AddApplicantProvider({ children }: { children: ReactNode }) {
	const form = useAddApplicantFormInstance()
	return <AddApplicantContext.Provider value={form}>{children}</AddApplicantContext.Provider>
}

/** Read the shared add-applicant form. Throws when used outside the provider. */
export function useAddApplicantForm(): AddApplicantForm {
	const form = useContext(AddApplicantContext)
	if (form === null) {
		throw new Error('useAddApplicantForm must be used within <AddApplicantProvider>')
	}
	return form
}
