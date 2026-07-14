import { useAccountSession } from '@/components/account'
import { BodyScrollView } from '@/components/core'
import { authClient } from '@/lib/auth-client'
import { useMyBlocks, useUnblockAuthor } from '@/screens/community/community.data'
import { api } from '@convex/_generated/api'
import { useAction, useMutation } from 'convex/react'
import { Button, Separator, Typography } from 'heroui-native'
import { useEffect, useState } from 'react'
import { Alert, View } from 'react-native'

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

/** Provider + sign-out for converted accounts; hidden for temp sessions
 * (signing a temp session out would strand its data behind no credentials). */
function SignInSection() {
	const { isCredentialed } = useAccountSession()
	const providerLabel = useProviderLabel(isCredentialed)
	if (!isCredentialed) return null
	return (
		<View className="gap-control">
			<Typography.Heading className="text-lg font-semibold">Sign-in</Typography.Heading>
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
			<View className="gap-control">
				<Typography.Heading className="text-lg font-semibold">
					Blocked in Community
				</Typography.Heading>
				<Typography.Paragraph color="muted" className="text-sm">
					You won’t see posts or comments from these authors.
				</Typography.Paragraph>
				{blocks.map((block) => (
					<View key={block.profileId} className="flex-row items-center justify-between gap-control">
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
			<View className="gap-control">
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
		<View className="gap-control">
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

/**
 * The Settings sub-screen (M7-T3): the account plumbing that used to crowd
 * the Profile page — sign-in/sign-out, community blocks, deletion, and dev
 * tools — kept one level below so the Account tab itself stays calm.
 */
export function AccountSettingsScreen() {
	return (
		<BodyScrollView contentContainerClassName="gap-section px-gutter pt-card pb-8">
			<SignInSection />
			<BlockedAuthorsSection />
			<DeleteAccountSection />
			{__DEV__ && (
				<>
					<Separator />
					<DevSection />
				</>
			)}
		</BodyScrollView>
	)
}
