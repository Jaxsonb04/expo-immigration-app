import { StyledLucideIcon } from '@/components/styled-icon'
import type { ScreeningStop } from '@convex/shared/screening'
import { Surface, Typography } from 'heroui-native'
import { Linking, Pressable, View } from 'react-native'

/**
 * An honest eligibility stop (shared/screening.ts): explains why the app
 * won't prepare this situation and points at the official USCIS next step.
 * Rendered wherever screening blocks — the new-application pre-screen and the
 * interview steps — so the boundary always looks and reads the same.
 */
export function ScreeningStopNotice({ stop }: { stop: ScreeningStop }) {
	return (
		<Surface variant="secondary" className="gap-tight rounded-2xl p-card">
			<View className="flex-row items-center gap-tight">
				<StyledLucideIcon name="circle-alert" size={18} className="text-warning" />
				<Typography.Paragraph className="flex-1 font-medium">{stop.title}</Typography.Paragraph>
			</View>
			<Typography.Paragraph color="muted" className="text-sm leading-relaxed">
				{stop.explanation}
			</Typography.Paragraph>
			<View className="gap-hairline">
				{stop.officialLinks.map((link) => (
					<Pressable
						key={link.url}
						accessibilityRole="link"
						onPress={() => void Linking.openURL(link.url)}
					>
						<Typography.Paragraph className="text-sm text-accent underline">
							{link.label}
						</Typography.Paragraph>
					</Pressable>
				))}
			</View>
		</Surface>
	)
}
