import { TempAccountDeletionBanner } from '@/components/account'
import { BodyScrollView } from '@/components/core'
import { Spinner } from 'heroui-native'
import { View } from 'react-native'
import { DashboardProvider } from './home.context'
import { useHomeDashboard } from './home.data'
import { EmptyDashboard } from './home.empty'
import { HubSections } from './home.hub'
import { useRenewalItems } from './home.renewals'
import { StartApplicationButton } from './home.start-application-button'
import { Summary } from './home.summary'

/**
 * Forms tab (M7-T4): a compact one-screen hub. Each product area — renewals,
 * drafts, attention, completed — collapses to a single glanceable block with
 * a "see all" push into its full list, so the tab root never scrolls
 * (MASTER_PLAN Layout). The first-run intro is the route-owned TabIntro
 * overlay (M7-T5); the empty state is unchanged.
 */
export function HomeScreen() {
	const dashboard = useHomeDashboard()
	const renewalItems = useRenewalItems()

	if (dashboard === undefined || renewalItems === undefined) {
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

	// The one-time intro is an overlay owned by the route (TabIntro, M7-T5).
	if (!hasAnything) {
		return <EmptyDashboard />
	}

	return (
		<DashboardProvider dashboard={dashboard}>
			{/* One-screen root: content is sized to fit a single screen (iPhone SE
			    included), so the surface never actually scrolls. Scrolling and
			    bounce must stay natively enabled — disabling either makes iOS clamp
			    the resting offset to 0 and skip the automatic content inset, which
			    shoves this content under the transparent large-title header. */}
			<BodyScrollView contentContainerClassName="gap-4 pt-1">
				{/* M6-T4: only renders for a temp session in its final 24 hours. */}
				<TempAccountDeletionBanner />

				<View className="gap-1">
					<Summary.TodayLabel />
					<Summary.Headline />
				</View>

				<HubSections
					drafts={drafts}
					completed={completed}
					renewalItems={renewalItems}
					attentionItems={dashboard.attentionItems}
				/>

				<StartApplicationButton />
			</BodyScrollView>
		</DashboardProvider>
	)
}
