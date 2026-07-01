import { Typography } from 'heroui-native'
import { useDashboard } from './home.context'

function TodayLabel() {
	const label = new Date()
		.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
		.toUpperCase()
	return (
		<Typography.Paragraph color="muted" className="text-xs tracking-wider">
			{label}
		</Typography.Paragraph>
	)
}

/** Mockup direction: calm sentence with the two load-bearing counts bolded. */
function Headline() {
	const { summary } = useDashboard()
	return (
		<Typography.Heading type="h3" className="leading-10">
			<Typography.Heading type="h3" className="text-muted">
				You have{' '}
			</Typography.Heading>
			{`${summary.expiringDocumentsCount} ${summary.expiringDocumentsCount === 1 ? 'document' : 'documents'} expiring`}
			<Typography.Heading type="h3" className="text-muted">
				{' '}
				and{' '}
			</Typography.Heading>
			{`${summary.activeApplicationsCount} active ${summary.activeApplicationsCount === 1 ? 'application' : 'applications'}.`}
		</Typography.Heading>
	)
}

export const Summary = {
	TodayLabel,
	Headline,
}
