import { useAccountSession } from '@/components/account'
import { BodyScrollView } from '@/components/core'
import { resolveAccountDeletionMode } from '@/lib/account-deletion'
import { authClient } from '@/lib/auth-client'
import { RELEASE_FEATURES } from '@/lib/release-policy'
import { useMyBlocks, useUnblockAuthor } from '@/screens/community/community.data'
import { api } from '@convex/_generated/api'
import { useAction } from 'convex/react'
import { Button, Input, Label, Separator, TextField, Typography } from 'heroui-native'
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
						<Typography.Paragraph className="flex-1 font-medium">
							{block.handle}
						</Typography.Paragraph>
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

/**
 * Permanent in-app account deletion.
 *
 * Credentialed accounts confirm with their current password, then Better
 * Auth's delete-user hook purges app data before deleting the identity and
 * sessions. Temporary accounts have no password, so the app purges their data
 * first and then uses the anonymous plugin's dedicated identity endpoint.
 */
function DeleteAccountSection() {
	const { isCredentialed, isPending } = useAccountSession()
	const deleteAccountData = useAction(api.account.deleteAccountData)
	const [busy, setBusy] = useState(false)
	const [isConfirming, setIsConfirming] = useState(false)
	const [password, setPassword] = useState('')
	const deletionMode = resolveAccountDeletionMode(isPending, isCredentialed)

	async function eraseAccount() {
		if (deletionMode === 'loading') return
		if (deletionMode === 'credentialed' && !password) {
			Alert.alert('Password required', 'Enter your current password to delete this account.')
			return
		}

		setBusy(true)
		try {
			const { error } =
				deletionMode === 'credentialed'
					? await authClient.deleteUser({ password })
					: await (async () => {
							await deleteAccountData({})
							return authClient.deleteAnonymousUser()
						})()
			if (error) {
				throw new Error(error.message ?? 'The account could not be deleted.')
			}
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
		if (deletionMode === 'loading') return
		Alert.alert(
			'Delete your account?',
			'This permanently deletes your login account and all data associated with it, including saved cases and any previously stored Immifile data. It cannot be undone.',
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: deletionMode === 'credentialed' ? 'Continue' : 'Delete everything',
					style: 'destructive',
					onPress: () => {
						if (deletionMode === 'credentialed') {
							setIsConfirming(true)
						} else {
							void eraseAccount()
						}
					},
				},
			],
		)
	}

	return (
		<>
			<Separator />
			<View className="gap-control">
				<Typography.Heading className="text-lg font-semibold">Delete account</Typography.Heading>
				<Typography.Paragraph color="muted" className="text-sm">
					Permanently delete your login account, saved cases, and all other Immifile data. This
					cannot be undone.
				</Typography.Paragraph>
				{deletionMode === 'credentialed' && isConfirming ? (
					<View className="gap-control">
						<TextField>
							<Label>Current password</Label>
							<Input
								value={password}
								onChangeText={setPassword}
								placeholder="Enter your password"
								secureTextEntry
								autoCapitalize="none"
								autoComplete="current-password"
								textContentType="password"
								editable={!busy}
							/>
						</TextField>
						<View className="gap-tight">
							<Button variant="ghost" isDisabled={busy || !password} onPress={eraseAccount}>
								<Button.Label className="text-danger">
									{busy ? 'Deleting…' : 'Permanently delete account'}
								</Button.Label>
							</Button>
							<Button
								variant="ghost"
								isDisabled={busy}
								onPress={() => {
									setPassword('')
									setIsConfirming(false)
								}}
							>
								<Button.Label>Cancel</Button.Label>
							</Button>
						</View>
					</View>
				) : (
					<Button
						variant="ghost"
						isDisabled={busy || deletionMode === 'loading'}
						onPress={confirmDelete}
					>
						<Button.Label className="text-danger">
							{busy
								? 'Deleting…'
								: deletionMode === 'loading'
									? 'Loading account…'
									: 'Delete account'}
						</Button.Label>
					</Button>
				)}
			</View>
		</>
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
			{RELEASE_FEATURES.community ? <BlockedAuthorsSection /> : null}
			<DeleteAccountSection />
		</BodyScrollView>
	)
}
