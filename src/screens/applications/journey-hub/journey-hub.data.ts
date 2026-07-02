import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { useQuery } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'

export type ApplicationDetail = FunctionReturnType<typeof api.applications.getApplication>

export function useApplicationDetail(
	applicationId: Id<'applications'>,
): ApplicationDetail | undefined {
	return useQuery(api.applications.getApplication, { applicationId })
}
