import { BodyScrollView } from '@/components/core'
import { Typography } from 'heroui-native'
import { StartApplicationButton } from './home.start-application-button'

/** First-run state: no applications, documents, or activity yet. */
export function EmptyDashboard() {
	return (
		<BodyScrollView>
			<Typography.Heading className="text-3xl font-semibold">
				Let's get your renewal moving.
			</Typography.Heading>
			<Typography.Paragraph color="muted" className="text-lg">
				Answer plain-language questions, keep your documents in one place, and never miss a
				deadline. Completely free.
			</Typography.Paragraph>
			<StartApplicationButton />
		</BodyScrollView>
	)
}
