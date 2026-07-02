import { BodyScrollView } from '@/components/core'
import { authClient } from '@/lib/auth-client'
import { api } from '@convex/_generated/api'
import { useAction, useMutation } from 'convex/react'
import { Stack } from 'expo-router'
import { Button, Separator, Typography, useThemeColor } from 'heroui-native'
import { useState } from 'react'
import { Alert, View } from 'react-native'

/** Walkthrough-phase dev controls (decision 12); server-gated by DEV_SEED_ENABLED. */
function DevSection() {
	const seedDemo = useAction(api.dev.seed.seedDemo)
	const resetOwner = useMutation(api.dev.seed.resetOwner)
	const [busy, setBusy] = useState(false)

	async function run(label: string, fn: () => Promise<unknown>) {
		setBusy(true)
		try {
			await fn()
		} catch (error) {
			Alert.alert(label, error instanceof Error ? error.message : 'Failed')
		} finally {
			setBusy(false)
		}
	}

	return (
		<View className="gap-3">
			<Typography.Heading className="text-lg font-semibold">Developer</Typography.Heading>
			<Typography.Paragraph color="muted" className="text-sm">
				Walkthrough demo data — replaces everything in this workspace.
			</Typography.Paragraph>
			<Button
				variant="secondary"
				isDisabled={busy}
				onPress={() => run('Seed demo data', () => seedDemo({}))}
			>
				<Button.Label>Seed demo data</Button.Label>
			</Button>
			<Button
				variant="ghost"
				isDisabled={busy}
				onPress={() => run('Reset data', () => resetOwner({}))}
			>
				<Button.Label>Reset to empty</Button.Label>
			</Button>
		</View>
	)
}

export default function AccountTab() {
	const themeColorForeground = useThemeColor('foreground')
	return (
		<>
			<Stack.Title
				large
				largeStyle={{
					fontFamily: 'Montserrat_600SemiBold',
					color: themeColorForeground,
				}}
			>
				Account
			</Stack.Title>

			<BodyScrollView contentContainerClassName="gap-6 pt-4 px-5">
				<Typography.Paragraph color="muted">
					Settings, sign-in, and data export will live here.
				</Typography.Paragraph>
				<Button onPress={() => authClient.signOut()}>
					<Button.Label>Sign Out</Button.Label>
				</Button>

				{__DEV__ && (
					<>
						<Separator />
						<DevSection />
					</>
				)}
			</BodyScrollView>
		</>
	)
}
