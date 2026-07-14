import { TempAccountCard, useViewer } from '@/components/account'
import { BodyScrollView } from '@/components/core'
import { styledIcon, type StyledIconComponent } from '@/components/styled-icon'
import { authClient } from '@/lib/auth-client'
import { router, type Href } from 'expo-router'
import { Avatar, ListGroup, Separator, Typography } from 'heroui-native'
import { View } from 'react-native'

/** Initials for the avatar — first letters of up to two name words. */
function initialsFor(name: string | undefined): string {
	const words = (name ?? '').trim().split(/\s+/).filter(Boolean)
	if (words.length === 0) return '?'
	return words
		.slice(0, 2)
		.map((word) => word[0]!.toUpperCase())
		.join('')
}

/**
 * Who you are, at a glance (M7-T3): avatar, name, and how you're signed in.
 * The name comes from the Better Auth user record — the same source every
 * greeting reads (useViewer) — so an edit on the details screen shows up here
 * the moment it saves.
 */
function IdentityPreview() {
	const { isTemp, firstName } = useViewer()
	const { data } = authClient.useSession()
	const user = data?.user

	return (
		<View className="flex-row items-center gap-card">
			<Avatar size="lg" variant="soft" color="accent" alt="Your account">
				<Avatar.Fallback>
					<Typography.Heading className="text-xl text-accent">
						{isTemp ? '·' : initialsFor(user?.name)}
					</Typography.Heading>
				</Avatar.Fallback>
			</Avatar>
			<View className="flex-1 gap-hairline">
				<Typography.Heading className="font-display text-2xl">
					{isTemp ? 'Welcome' : firstName ? `Welcome back, ${firstName}` : 'Welcome back'}
				</Typography.Heading>
				<Typography.Paragraph color="muted" className="text-sm">
					{isTemp ? 'Temporary account' : (user?.email ?? '')}
				</Typography.Paragraph>
			</View>
		</View>
	)
}

type Row = {
	icon: StyledIconComponent
	title: string
	description: string
	href: Href
}

const PROFILE_ROWS: Row[] = [
	{
		icon: styledIcon({ family: 'lucide', name: 'user-round' }),
		title: 'Personal details',
		description: 'Name, birth details, mailing address',
		href: '/account/details',
	},
	{
		icon: styledIcon({ family: 'lucide', name: 'folder' }),
		title: 'Documents',
		description: 'Reusable uploads for your filings',
		href: '/account/documents',
	},
]

const APP_ROWS: Row[] = [
	{
		icon: styledIcon({ family: 'lucide', name: 'settings' }),
		title: 'Settings',
		description: 'Sign-in, data, and privacy',
		href: '/account/settings',
	},
]

function RowGroup({ label, rows }: { label: string; rows: Row[] }) {
	return (
		<View className="gap-tight">
			<Typography.Paragraph color="muted" className="ml-hairline text-sm">
				{label}
			</Typography.Paragraph>
			<ListGroup>
				{rows.map((row, index) => {
					const Icon = row.icon
					return (
						<View key={row.title}>
							{index > 0 ? <Separator className="mx-card" /> : null}
							<ListGroup.Item
								accessibilityRole="button"
								accessibilityLabel={row.title}
								onPress={() => router.push(row.href)}
							>
								<ListGroup.ItemPrefix>
									<Icon size={20} className="text-muted" />
								</ListGroup.ItemPrefix>
								<ListGroup.ItemContent>
									<ListGroup.ItemTitle>{row.title}</ListGroup.ItemTitle>
									<ListGroup.ItemDescription>{row.description}</ListGroup.ItemDescription>
								</ListGroup.ItemContent>
								<ListGroup.ItemSuffix />
							</ListGroup.Item>
						</View>
					)
				})}
			</ListGroup>
		</View>
	)
}

/**
 * The Account tab root (M7-T3): a calm identity preview, then progressively
 * disclosed groups — details and documents one level deeper, the noisy
 * account plumbing behind Settings. Deliberately fits one screen with no
 * root scroll (MASTER_PLAN Layout).
 */
export function AccountScreen() {
	const { isTemp } = useViewer()
	// One-screen root: content fits a single screen, so the surface never
	// actually scrolls. Scrolling/bounce stay natively enabled — disabling
	// them makes iOS skip the automatic large-title content inset (see the
	// note in home.screen.tsx).
	return (
		<BodyScrollView contentContainerClassName="gap-section pt-tight">
			<IdentityPreview />
			{isTemp ? <TempAccountCard /> : null}
			<RowGroup label="Your filing profile" rows={PROFILE_ROWS} />
			<RowGroup label="App" rows={APP_ROWS} />
		</BodyScrollView>
	)
}
