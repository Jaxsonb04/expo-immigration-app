import { humanErrorMessage } from '@/lib/error-message'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { useMutation, useQuery } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import { useEffect, useRef } from 'react'
import { Alert } from 'react-native'

// getApplication returns null for a deleted/foreign id (so a live
// subscription outliving a deleteApplication renders a fallback, not a
// crash); ApplicationDetail is the loaded, non-null payload.
export type ApplicationDetail = NonNullable<
	FunctionReturnType<typeof api.applications.getApplication>
>

export function useApplicationDetail(
	applicationId: Id<'applications'>,
): ApplicationDetail | null | undefined {
	const detail = useQuery(api.applications.getApplication, { applicationId })
	const reconcile = useMutation(api.applications.reconcileApplicationRequirements)
	const attemptedId = useRef<string | null>(null)

	useEffect(() => {
		if (detail?.requirementsReconciled) {
			attemptedId.current = null
			return
		}
		if (
			detail === undefined ||
			detail === null ||
			detail.application.status !== 'draft' ||
			attemptedId.current === applicationId
		) {
			return
		}
		attemptedId.current = applicationId
		void reconcile({ applicationId }).catch((error) => {
			attemptedId.current = null
			Alert.alert(
				"Couldn't update the evidence checklist",
				humanErrorMessage(error, 'Close this application and try again.'),
			)
		})
	}, [applicationId, detail, reconcile])

	return detail
}

// Filed-lifecycle transitions (convex/applications.ts): every one is an
// explicit user-confirmed action — the UI always confirms before calling.

export function useMarkFiled() {
	return useMutation(api.applications.markFiled)
}

export function useCloseApplication() {
	return useMutation(api.applications.closeApplication)
}

export function useReopenApplication() {
	return useMutation(api.applications.reopenApplication)
}

export function useDeleteApplication() {
	return useMutation(api.applications.deleteApplication)
}
