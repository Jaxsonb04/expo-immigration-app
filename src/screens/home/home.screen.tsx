import { BodyScrollView } from '@/components/core'
import { Spinner } from 'heroui-native'
import { View } from 'react-native'
import { Activity } from './home.activity'
import { ActiveApplications } from './home.active-applications'
import { Attention } from './home.attention'
import { DashboardProvider } from './home.context'
import { useHomeDashboard } from './home.data'
import { EmptyDashboard } from './home.empty'
import { StartApplicationButton } from './home.start-application-button'
import { Summary } from './home.summary'

export function HomeScreen() {
	const dashboard = useHomeDashboard()

	if (dashboard === undefined) {
		return (
			<View className="flex-1 items-center justify-center bg-background">
				<Spinner />
			</View>
		)
	}

	const isEmpty =
		dashboard.activeApplications.length === 0 &&
		dashboard.attentionItems.length === 0 &&
		dashboard.recentActivity.length === 0

	if (isEmpty) {
		return <EmptyDashboard />
	}

	return (
		<DashboardProvider dashboard={dashboard}>
			{/* One consistent section rhythm: each block is a group, `gap-8` on the
			    scroll body owns the space between them. */}
			<BodyScrollView contentContainerClassName="gap-8">
				<View className="gap-1 pt-3">
					<Summary.TodayLabel />
					<Summary.Headline />
				</View>

				<View className="gap-3">
					<ActiveApplications.Heading />
					<ActiveApplications.Rail />
				</View>

				{dashboard.attentionItems.length > 0 && (
					<View className="gap-1">
						<Attention.Heading />
						<Attention.List />
					</View>
				)}

				{dashboard.recentActivity.length > 0 && (
					<View className="gap-1">
						<Activity.Heading />
						<Activity.List />
					</View>
				)}

				<StartApplicationButton variant="secondary" />
			</BodyScrollView>
		</DashboardProvider>
	)
}
