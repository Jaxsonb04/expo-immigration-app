import { relativeTime } from '@/lib/application-labels'
import { Typography } from 'heroui-native'
import { useJourneyHub } from './journey-hub.context'

export function LastSaved() {
	const { draft } = useJourneyHub()
	return (
		<Typography.Paragraph color="muted" className="text-xs">
			Last saved {relativeTime(draft.updatedAt)}
		</Typography.Paragraph>
	)
}
