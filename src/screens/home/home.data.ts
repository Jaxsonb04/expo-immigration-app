import { api } from '@convex/_generated/api'
import { useQuery } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'

export type HomeDashboard = FunctionReturnType<typeof api.home.getHomeDashboard>
export type ActiveApplication = HomeDashboard['activeApplications'][number]
export type AttentionItem = HomeDashboard['attentionItems'][number]
export type ActivityItem = HomeDashboard['recentActivity'][number]

export function useHomeDashboard(): HomeDashboard | undefined {
	return useQuery(api.home.getHomeDashboard, {})
}
