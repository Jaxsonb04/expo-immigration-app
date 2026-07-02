import { authClient } from '@/lib/auth-client'
import { Button, Input, Label, Separator, TextField, Typography } from 'heroui-native'
import { SocialAuthButton, type SocialAuthButtonProvider } from 'heroui-native-pro'
import { useEffect, useRef, useState } from 'react'
import { Alert, View } from 'react-native'
import { useAccountSession } from '../account.session'

// "Apple/Google/email" upgrade actions (ADR-0010). Constrained to providers
// heroui-native-pro renders an icon for and Better Auth supports as socials.
type SocialProvider = Extract<SocialAuthButtonProvider, 'apple' | 'google'>
const SOCIAL_PROVIDERS: SocialProvider[] = ['apple', 'google']

/**
 * The reusable upgrade form: social + email actions that convert the current
 * anonymous session into a permanent account. Shared by the contextual
 * `UpgradeSheet` (bottom sheet) and the `/upgrade` full-screen modal.
 *
 * For an anonymous session, calling `signUp.email` / `signIn.social` LINKS the
 * anonymous identity to the new credentials — Better Auth's anonymous plugin
 * fires `onLinkAccount` server-side (convex/auth.ts), which preserves the
 * anonymous-created data. The link is complete when the session is no longer
 * anonymous, which is when `onUpgraded` fires (driving auto-resume). Watching
 * the session covers both email sign-up (resolves inline) and social sign-in
 * (resolves after the OAuth deep-link callback).
 */
export function UpgradeActions({ onUpgraded }: { onUpgraded?: () => void }) {
	const { isCredentialed } = useAccountSession()
	const [name, setName] = useState('')
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [pending, setPending] = useState(false)

	const onUpgradedRef = useRef(onUpgraded)
	useEffect(() => {
		onUpgradedRef.current = onUpgraded
	})
	useEffect(() => {
		if (isCredentialed) {
			onUpgradedRef.current?.()
		}
	}, [isCredentialed])

	async function handleEmailUpgrade(): Promise<void> {
		if (!email.trim() || !password || !name.trim()) {
			Alert.alert('Missing details', 'Add your name, email, and a password to create your account.')
			return
		}

		setPending(true)
		try {
			const { error } = await authClient.signUp.email({
				name: name.trim(),
				email: email.trim(),
				password,
			})
			if (error) {
				Alert.alert(
					'Could not create account',
					error.message ?? 'Please check your details and try again.',
				)
			}
			// Success is handled by the `isCredentialed` effect above.
		} catch (err) {
			Alert.alert('Something went wrong', err instanceof Error ? err.message : 'Please try again.')
		} finally {
			setPending(false)
		}
	}

	async function handleSocialUpgrade(provider: SocialProvider): Promise<void> {
		setPending(true)
		try {
			const { error } = await authClient.signIn.social({ provider, callbackURL: '/' })
			if (error) {
				Alert.alert('Could not continue', error.message ?? 'Please try again.')
			}
		} catch (err) {
			Alert.alert('Something went wrong', err instanceof Error ? err.message : 'Please try again.')
		} finally {
			setPending(false)
		}
	}

	return (
		<View className="gap-6">
			<View className="gap-3">
				{SOCIAL_PROVIDERS.map((provider) => (
					<SocialAuthButton
						key={provider}
						provider={provider}
						isDisabled={pending}
						onPress={() => handleSocialUpgrade(provider)}
					/>
				))}
			</View>

			<View className="flex-row items-center gap-4">
				<Separator className="flex-1" />
				<Typography.Paragraph color="muted" className="text-sm">
					or use email
				</Typography.Paragraph>
				<Separator className="flex-1" />
			</View>

			<View className="gap-4">
				<TextField>
					<Label>Name</Label>
					<Input
						value={name}
						onChangeText={setName}
						placeholder="Jane Doe"
						autoCapitalize="words"
						textContentType="name"
						editable={!pending}
					/>
				</TextField>

				<TextField>
					<Label>Email</Label>
					<Input
						value={email}
						onChangeText={setEmail}
						placeholder="you@example.com"
						autoCapitalize="none"
						autoComplete="email"
						keyboardType="email-address"
						textContentType="emailAddress"
						editable={!pending}
					/>
				</TextField>

				<TextField>
					<Label>Password</Label>
					<Input
						value={password}
						onChangeText={setPassword}
						placeholder="••••••••"
						secureTextEntry
						autoCapitalize="none"
						textContentType="newPassword"
						editable={!pending}
					/>
				</TextField>
			</View>

			<Button isDisabled={pending} onPress={handleEmailUpgrade}>
				<Button.Label>{pending ? 'Creating account…' : 'Create account'}</Button.Label>
			</Button>
		</View>
	)
}
