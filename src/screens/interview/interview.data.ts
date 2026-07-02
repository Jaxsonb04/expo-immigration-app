import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { useMutation, useQuery } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'

export type ApplicationDetail = FunctionReturnType<typeof api.applications.getApplication>

export function useApplicationDetail(
	applicationId: Id<'applications'>,
): ApplicationDetail | undefined {
	return useQuery(api.applications.getApplication, { applicationId })
}

/** The Next-save mutation (idempotent per applicationId + stepKey). */
export function useSaveApplicationStep() {
	return useMutation(api.applications.saveApplicationStep)
}
