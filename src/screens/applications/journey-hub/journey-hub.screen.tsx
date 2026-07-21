import { BodyScrollView } from '@/components/core'
import type { Id } from '@convex/_generated/dataModel'
import { useRouter } from 'expo-router'
import { Button, Separator, Spinner, Typography } from 'heroui-native'
import { View } from 'react-native'
import { JourneyHub } from './journey-hub'
import { useApplicationDetail } from './journey-hub.data'

export function JourneyHubScreen(props: { applicationId: Id<'applications'> }) {
	const router = useRouter()
	const detail = useApplicationDetail(props.applicationId)

	if (detail === undefined) {
		return (
			<View className="flex-1 items-center justify-center bg-background">
				<Spinner />
			</View>
		)
	}

	// Deleted (possibly from this very screen — the live query re-runs before
	// navigation finishes) or not this owner's application.
	if (detail === null) {
		return (
			<View className="flex-1 items-center justify-center gap-card bg-background px-gutter">
				<Typography.Paragraph color="muted" className="text-center">
					This application no longer exists.
				</Typography.Paragraph>
				<Button variant="secondary" onPress={() => router.back()}>
					<Button.Label>Go back</Button.Label>
				</Button>
			</View>
		)
	}

	return (
		<JourneyHub.Provider detail={detail}>
			<BodyScrollView contentContainerClassName="gap-section pt-card">
				<JourneyHub.Header />

				<JourneyHub.Prepare />
				<Separator />

				<JourneyHub.Documents />

				{/* ReviewPay, Track, and Manage render for some statuses only, so
				    each brings its own leading separator. */}
				<JourneyHub.ReviewPay />

				<JourneyHub.Track />

				<JourneyHub.Manage />

				<JourneyHub.LastSaved />
			</BodyScrollView>
		</JourneyHub.Provider>
	)
}
