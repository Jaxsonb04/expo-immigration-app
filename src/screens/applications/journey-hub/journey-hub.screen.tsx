import { BodyScrollView } from '@/components/core'
import type { Id } from '@convex/_generated/dataModel'
import { Separator, Spinner } from 'heroui-native'
import { View } from 'react-native'
import { JourneyHub } from './journey-hub'
import { useApplicationDetail } from './journey-hub.data'

export function JourneyHubScreen(props: { applicationId: Id<'applications'> }) {
	const detail = useApplicationDetail(props.applicationId)

	if (detail === undefined) {
		return (
			<View className="flex-1 items-center justify-center bg-background">
				<Spinner />
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
				<Separator />

				<JourneyHub.ReviewPay />
				<Separator />

				<JourneyHub.Track />

				<JourneyHub.LastSaved />
			</BodyScrollView>
		</JourneyHub.Provider>
	)
}
