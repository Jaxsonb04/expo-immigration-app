import { BodyScrollView } from '@/components/core'
import { authClient } from '@/lib/auth-client'
import { useMyBlocks, useUnblockAuthor } from '@/screens/community/community.data'
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

/** Blocked community authors (M4-T3): handles only, with one-tap unblock.
 * Hidden entirely while the viewer has no blocks. */
function BlockedAuthorsSection() {
	const blocks = useMyBlocks()
	const unblockAuthor = useUnblockAuthor()
	if (blocks === undefined || blocks.length === 0) return null
	return (
		<>
			<Separator />
			<View className="gap-3">
				<Typography.Heading className="text-lg font-semibold">
					Blocked in Community
				</Typography.Heading>
				<Typography.Paragraph color="muted" className="text-sm">
					You won’t see posts or comments from these authors.
				</Typography.Paragraph>
				{blocks.map((block) => (
					<View key={block.profileId} className="flex-row items-center justify-between gap-3">
						<Typography.Paragraph className="flex-1 font-medium">{block.handle}</Typography.Paragraph>
						<Button
							size="sm"
							variant="secondary"
							onPress={() => void unblockAuthor({ profileId: block.profileId })}
						>
							<Button.Label>Unblock</Button.Label>
						</Button>
					</View>
				))}
			</View>
		</>
	)
}

/** Permanent in-app account deletion (M5-T3 release audit). Runs the full
 * owner-data cascade (convex/account.ts → convex/model/ownerData.ts): every
 * app-owned row AND every stored file, then signs the session out. The Better
 * Auth user record itself is deleted in the deferred auth-hardening phase
 * (scope note in convex/account.ts) — no app data or files survive today. */
function DeleteAccountSection() {
	const deleteAccountData = useMutation(api.account.deleteAccountData)
	const [busy, setBusy] = useState(false)

	async function eraseAndSignOut() {
		setBusy(true)
		try {
			await deleteAccountData({})
			await authClient.signOut()
		} catch (error) {
			Alert.alert(
				'Delete account',
				error instanceof Error ? error.message : 'Something went wrong. Please try again.',
			)
		} finally {
			setBusy(false)
		}
	}

	function confirmDelete() {
		Alert.alert(
			'Delete your account?',
			'This permanently erases everything — applications, answers, uploaded documents, cases, and your community posts and profile. It cannot be undone.',
			[
				{ text: 'Cancel', style: 'cancel' },
				{ text: 'Delete everything', style: 'destructive', onPress: () => void eraseAndSignOut() },
			],
		)
	}

	return (
		<>
			<Separator />
			<View className="gap-3">
				<Typography.Heading className="text-lg font-semibold">Delete account</Typography.Heading>
				<Typography.Paragraph color="muted" className="text-sm">
					Permanently erase your applications, answers, uploaded documents, cases, and community
					activity from Immifile. This cannot be undone.
				</Typography.Paragraph>
				<Button variant="ghost" isDisabled={busy} onPress={confirmDelete}>
					<Button.Label className="text-danger">
						{busy ? 'Deleting…' : 'Delete account'}
					</Button.Label>
				</Button>
			</View>
		</>
	)
}

export default function AccountTab() {
	const themeColorForeground = useThemeColor('foreground')
	return (
		<>
			<Stack.Title
				large
				largeStyle={{
					fontFamily: 'Fraunces_600SemiBold',
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

				<BlockedAuthorsSection />

				<DeleteAccountSection />

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
