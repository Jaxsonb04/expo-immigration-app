import { TempAccountCard, useViewer } from '@/components/account'
import { authClient } from '@/lib/auth-client'
import { Avatar, Button, Typography } from 'heroui-native'
import { useEffect, useState } from 'react'
import { View } from 'react-native'

/** Initials for the avatar fallback — first letters of up to two name words. */
function initialsFor(name: string | undefined): string {
	const words = (name ?? '').trim().split(/\s+/).filter(Boolean)
	if (words.length === 0) return '?'
	return words
		.slice(0, 2)
		.map((word) => word[0]!.toUpperCase())
		.join('')
}

const PROVIDER_LABELS: Record<string, string> = {
	google: 'Google',
	apple: 'Apple',
	credential: 'Email & password',
}

/** The linked sign-in method(s), e.g. "Google" — loaded once, best-effort. */
function useProviderLabel(isCredentialed: boolean): string | null {
	const [label, setLabel] = useState<string | null>(null)
	useEffect(() => {
		if (!isCredentialed) return
		let cancelled = false
		void authClient
			.listAccounts()
			.then(({ data }) => {
				if (cancelled || !data) return
				const labels = data.map(
					(account) => PROVIDER_LABELS[account.providerId] ?? account.providerId,
				)
				if (labels.length > 0) setLabel([...new Set(labels)].join(', '))
			})
			.catch(() => {
				// Cosmetic only — the section renders fine without a provider line.
			})
		return () => {
			cancelled = true
		}
	}, [isCredentialed])
	return label
}

/**
 * Who you are + how you're signed in (M6-T5). A converted account sees its
 * name, email, provider, and sign-out; a temporary session sees the neutral
 * header and the conversion card (M6-T3) instead.
 */
export function ProfileIdentity() {
	const { isTemp, firstName } = useViewer()
	const { data } = authClient.useSession()
	const user = data?.user
	const providerLabel = useProviderLabel(!isTemp && Boolean(user))

	return (
		<View className="gap-5">
			<View className="flex-row items-center gap-4">
				<Avatar size="lg" variant="soft" color="accent" alt="Your profile">
					<Avatar.Fallback>
						<Typography.Heading className="text-xl text-accent">
							{isTemp ? '·' : initialsFor(user?.name)}
						</Typography.Heading>
					</Avatar.Fallback>
				</Avatar>
				<View className="flex-1 gap-0.5">
					<Typography.Heading className="font-display text-2xl">
						{isTemp ? 'Welcome' : firstName ? `Welcome back, ${firstName}` : 'Welcome back'}
					</Typography.Heading>
					<Typography.Paragraph color="muted" className="text-sm">
						{isTemp ? 'Temporary account' : (user?.email ?? '')}
					</Typography.Paragraph>
				</View>
			</View>

			{isTemp ? (
				<TempAccountCard />
			) : (
				<View className="gap-3">
					{providerLabel !== null && (
						<View className="flex-row items-center justify-between">
							<Typography.Paragraph color="muted" className="text-sm">
								Signed in with
							</Typography.Paragraph>
							<Typography.Paragraph className="text-sm font-medium">
								{providerLabel}
							</Typography.Paragraph>
						</View>
					)}
					<Button variant="secondary" onPress={() => void authClient.signOut()}>
						<Button.Label>Sign out</Button.Label>
					</Button>
				</View>
			)}
		</View>
	)
}
