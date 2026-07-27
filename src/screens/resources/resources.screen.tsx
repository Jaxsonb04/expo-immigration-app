import { BodyScrollView } from '@/components/core'
import { StyledLucideIcon } from '@/components/styled-icon'
import { Surface, Typography } from 'heroui-native'
import { Alert, Linking, Pressable, View } from 'react-native'

const OFFICIAL_RESOURCES = [
	{
		title: 'Check case status',
		detail: 'Open USCIS Case Status Online.',
		url: 'https://www.uscis.gov/casestatus',
		icon: 'search',
	},
	{
		title: 'Check processing times',
		detail: 'See current USCIS estimates by form and office.',
		url: 'https://www.uscis.gov/processingtimes',
		icon: 'clock-3',
	},
	{
		title: 'Change your address',
		detail: 'Use the official USCIS address-change tools.',
		url: 'https://www.uscis.gov/addresschange',
		icon: 'map-pin-house',
	},
	{
		title: 'USCIS online tools',
		detail: 'Find appointments, e-Requests, forms, and more.',
		url: 'https://www.uscis.gov/tools',
		icon: 'wrench',
	},
	{
		title: 'Find legal representation',
		detail: 'Use the U.S. Department of Justice directory.',
		url: 'https://www.justice.gov/eoir/find-legal-representation',
		icon: 'scale',
	},
] as const

async function openOfficialUrl(url: string): Promise<void> {
	try {
		await Linking.openURL(url)
	} catch {
		Alert.alert('Could not open this link', 'Please try again when you have a connection.')
	}
}

export function ResourcesScreen() {
	return (
		<BodyScrollView contentContainerClassName="gap-section py-card">
			<Surface variant="secondary" className="gap-tight rounded-2xl p-card">
				<View className="flex-row items-start gap-control">
					<StyledLucideIcon name="shield-check" size={20} className="mt-hairline text-accent" />
					<View className="flex-1 gap-hairline">
						<Typography.Paragraph className="font-semibold">
							Official sources first
						</Typography.Paragraph>
						<Typography.Paragraph color="muted" className="text-sm leading-relaxed">
							These links open USCIS.gov or Justice.gov. Immifile is independent and does not
							represent the U.S. government.
						</Typography.Paragraph>
					</View>
				</View>
			</Surface>

			<View className="gap-control">
				<Typography.Heading className="text-lg font-semibold">USCIS tools</Typography.Heading>
				{OFFICIAL_RESOURCES.map((resource) => (
					<Pressable
						key={resource.url}
						accessibilityRole="link"
						accessibilityLabel={resource.title}
						onPress={() => void openOfficialUrl(resource.url)}
					>
						<Surface
							variant="secondary"
							className="flex-row items-center gap-control rounded-2xl p-card"
						>
							<StyledLucideIcon name={resource.icon} size={20} className="text-accent" />
							<View className="flex-1 gap-hairline">
								<Typography.Paragraph className="font-medium">
									{resource.title}
								</Typography.Paragraph>
								<Typography.Paragraph color="muted" className="text-sm">
									{resource.detail}
								</Typography.Paragraph>
							</View>
							<StyledLucideIcon name="external-link" size={16} className="text-muted" />
						</Surface>
					</Pressable>
				))}
			</View>

			<Typography.Paragraph color="muted" className="text-center text-xs leading-relaxed">
				General information only — not legal advice. Always confirm important information on an
				official .gov website.
			</Typography.Paragraph>
		</BodyScrollView>
	)
}
