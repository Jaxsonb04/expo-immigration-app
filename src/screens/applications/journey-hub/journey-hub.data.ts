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
