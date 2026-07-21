import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { useMutation, useQuery } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'

// getApplication returns null for a deleted/foreign id; ApplicationDetail is
// the loaded, non-null payload.
export type ApplicationDetail = NonNullable<
	FunctionReturnType<typeof api.applications.getApplication>
>

export function useApplicationDetail(
	applicationId: Id<'applications'>,
): ApplicationDetail | null | undefined {
	return useQuery(api.applications.getApplication, { applicationId })
}

/** The Next-save mutation (idempotent per applicationId + stepKey). */
export function useSaveApplicationStep() {
	return useMutation(api.applications.saveApplicationStep)
}
