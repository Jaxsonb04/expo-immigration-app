import { SectionHeading } from '@/components/core'
import { StyledLucideIcon } from '@/components/styled-icon'
import { situationLabel } from '@/lib/application-labels'
import { useRouter } from 'expo-router'
import { Typography } from 'heroui-native'
import { Pressable, View } from 'react-native'
import type { ActiveApplication } from './home.data'

/**
 * Completed (filed) applications as a compact scannable group (M6-T6),
 * distinct from Drafts. Rows open the journey hub, where the filed packet and
 * case link live.
 */
export function Completed({ applications }: { applications: ActiveApplication[] }) {
	const router = useRouter()
	if (applications.length === 0) return null
	return (
		<View className="gap-hairline">
			<SectionHeading title="Completed" count={applications.length} />
			{applications.map((application) => {
				const label = situationLabel(application.formType, application.applicationKind)
				return (
					<Pressable
						key={application._id}
						accessibilityRole="button"
						onPress={() => router.push(`/application/${application._id}`)}
						className="flex-row items-center gap-control py-tight"
					>
						<StyledLucideIcon name="circle-check" size={20} className="text-success" />
						<View className="flex-1">
							<Typography.Paragraph className="font-medium">{label.primary}</Typography.Paragraph>
							<Typography.Paragraph color="muted" className="text-sm">
								{application.applicantName}
								{application.filedAt !== undefined &&
									` · filed ${new Date(application.filedAt).toLocaleDateString()}`}
							</Typography.Paragraph>
						</View>
						<StyledLucideIcon name="chevron-right" size={16} className="text-muted" />
					</Pressable>
				)
			})}
		</View>
	)
}
