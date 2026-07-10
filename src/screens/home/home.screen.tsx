import { TempAccountDeletionBanner } from '@/components/account'
import { BodyScrollView } from '@/components/core'
import { api } from '@convex/_generated/api'
import { useQuery } from 'convex/react'
import { Spinner } from 'heroui-native'
import { View } from 'react-native'
import { ActiveApplications } from './home.active-applications'
import { Attention } from './home.attention'
import { Completed } from './home.completed'
import { DashboardProvider } from './home.context'
import { useHomeDashboard } from './home.data'
import { EmptyDashboard } from './home.empty'
import { IntroDashboard } from './home.intro'
import { Renewals, useRenewalItems } from './home.renewals'
import { StartApplicationButton } from './home.start-application-button'
import { Summary } from './home.summary'

/**
 * Forms tab (M6-T6): a first-run intro until acknowledged, then a compact
 * dashboard — drafts, completed filings, upcoming renewals, attention items —
 * targeted at a single screen. The old long-scroll layout (activity feed,
 * always-on feature pitch) is gone.
 */
export function HomeScreen() {
	const dashboard = useHomeDashboard()
	const introDismissed = useQuery(api.preferences.getPreference, { key: 'formsIntroDismissed' })
	const renewalItems = useRenewalItems()

	if (dashboard === undefined || introDismissed === undefined || renewalItems === undefined) {
		return (
			<View className="flex-1 items-center justify-center bg-background">
				<Spinner />
			</View>
		)
	}

	const drafts = dashboard.activeApplications.filter((a) => a.status === 'draft')
	const completed = dashboard.activeApplications.filter((a) => a.status === 'filed')
	const hasAnything =
		drafts.length > 0 ||
		completed.length > 0 ||
		renewalItems.length > 0 ||
		dashboard.attentionItems.length > 0

	// The feature intro shows exactly once, and only while there is nothing
	// real to show in its place; anyone with data has clearly gotten started.
	if (!introDismissed && !hasAnything) {
		return <IntroDashboard />
	}
	if (!hasAnything) {
		return <EmptyDashboard />
	}

	return (
		<DashboardProvider dashboard={dashboard}>
			{/* One consistent section rhythm: each block is a group, `gap-8` on the
			    scroll body owns the space between them. */}
			<BodyScrollView contentContainerClassName="gap-8">
				{/* M6-T4: only renders for a temp session in its final 24 hours. */}
				<TempAccountDeletionBanner />

				<View className="gap-1 pt-3">
					<Summary.TodayLabel />
					<Summary.Headline />
				</View>

				{drafts.length > 0 && (
					<View className="gap-3">
						<ActiveApplications.Heading />
						<ActiveApplications.Rail />
					</View>
				)}

				<Completed applications={completed} />

				<Renewals items={renewalItems} />

				{dashboard.attentionItems.length > 0 && (
					<View className="gap-1">
						<Attention.Heading />
						<Attention.List />
					</View>
				)}

				<StartApplicationButton variant="secondary" />
			</BodyScrollView>
		</DashboardProvider>
	)
}
