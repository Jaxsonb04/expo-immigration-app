import { BodyScrollView } from '@/components/core'
import { Spinner } from 'heroui-native'
import { View } from 'react-native'
import { ActiveApplications } from './home.active-applications'
import { Attention } from './home.attention'
import { Completed } from './home.completed'
import { DashboardProvider } from './home.context'
import { useHomeDashboard } from './home.data'
import { Renewals, useRenewalItems } from './home.renewals'

// M7-T4 "see all" detail screens: the full lists the hub rows summarize.
// Thin wrappers around the existing M6 section components — the long content
// moved one level deeper, it was not rebuilt.

function Loading() {
	return (
		<View className="flex-1 items-center justify-center bg-background">
			<Spinner />
		</View>
	)
}

/** Every draft, as full-width cards. */
export function DraftsScreen() {
	const dashboard = useHomeDashboard()
	if (dashboard === undefined) return <Loading />
	const drafts = dashboard.activeApplications.filter((a) => a.status === 'draft')
	return (
		<BodyScrollView contentContainerClassName="gap-control pt-card">
			{drafts.map((application) => (
				<ActiveApplications.Card
					key={application._id}
					application={application}
					className="w-full"
				/>
			))}
		</BodyScrollView>
	)
}

/** Every filed application. */
export function CompletedScreen() {
	const dashboard = useHomeDashboard()
	if (dashboard === undefined) return <Loading />
	const completed = dashboard.activeApplications.filter((a) => a.status === 'filed')
	return (
		<BodyScrollView contentContainerClassName="pt-card">
			<Completed applications={completed} />
		</BodyScrollView>
	)
}

/** Every renewal source plus the manual-entry affordance (M6-T6). */
export function RenewalsScreen() {
	const items = useRenewalItems()
	if (items === undefined) return <Loading />
	return (
		<BodyScrollView contentContainerClassName="pt-card">
			<Renewals items={items} />
		</BodyScrollView>
	)
}

/** Every attention item. */
export function AttentionScreen() {
	const dashboard = useHomeDashboard()
	if (dashboard === undefined) return <Loading />
	return (
		<DashboardProvider dashboard={dashboard}>
			<BodyScrollView contentContainerClassName="pt-card">
				<Attention.List />
			</BodyScrollView>
		</DashboardProvider>
	)
}
