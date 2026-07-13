import { authClient } from '@/lib/auth-client'
import { ensureSessionResolved } from '@/lib/session-sync'
import { Button, Input, Label, Separator, TextField, Typography } from 'heroui-native'
import { SocialAuthButton, type SocialAuthButtonProvider } from 'heroui-native-pro'
import { useState } from 'react'
import { Alert, Text, View } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'

type Mode = 'sign-in' | 'sign-up'

// Google is the only social provider wired up for now; Apple is planned next.
// GitHub is intentionally excluded — a developer identity provider makes no
// sense for this app's audience (immigrants filing USCIS paperwork). Keep this
// list to providers heroui-native-pro renders an icon for and Better Auth
// supports.
type SocialProvider = Extract<SocialAuthButtonProvider, 'google' | 'apple'>

const SOCIAL_PROVIDERS: SocialProvider[] = ['google']

/**
 * Dedicated sign-in screen for returning users, pushed from the Welcome screen
 * (ADR-0009). Anonymous-first onboarding means this is no longer the app's
 * entry wall — it's an opt-in destination for people who already have an
 * account. The sign-up toggle is retained for now.
 */
export default function SignInScreen() {
	const [mode, setMode] = useState<Mode>('sign-in')
	const [name, setName] = useState('')
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [pending, setPending] = useState(false)

	const isSignUp = mode === 'sign-up'

	async function handleEmailAuth(): Promise<void> {
		if (!email.trim() || !password || (isSignUp && !name.trim())) {
			Alert.alert('Missing details', 'Please fill in all of the fields to continue.')
			return
		}

		setPending(true)
		try {
			const { error } = isSignUp
				? await authClient.signUp.email({ name: name.trim(), email: email.trim(), password })
				: await authClient.signIn.email({ email: email.trim(), password })

			if (error) {
				Alert.alert(
					'Authentication failed',
					error.message ?? 'Please check your details and try again.',
				)
				return
			}
			// The credentials were accepted and the session cookie is persisted;
			// the protected route in the root layout redirects into the app once
			// the reactive session atom reflects it. Drive that atom past the
			// refetch race so the redirect is not stranded (see ensureSessionResolved).
			const resolved = await ensureSessionResolved()
			if (!resolved) {
				Alert.alert(
					'Almost there',
					"We couldn't finish loading your session. Please try again.",
				)
			}
		} catch (err) {
			Alert.alert('Something went wrong', err instanceof Error ? err.message : 'Please try again.')
		} finally {
			setPending(false)
		}
	}

	async function handleSocialAuth(provider: SocialProvider): Promise<void> {
		setPending(true)
		try {
			const { error } = await authClient.signIn.social({ provider, callbackURL: '/' })
			if (error) {
				Alert.alert('Authentication failed', error.message ?? 'Please try again.')
				return
			}
			// `signIn.social` resolves only after the OAuth browser flow writes the
			// session cookie (or the user dismisses it). Drive the reactive atom so
			// a successful sign-in isn't stranded by the refetch race; if it never
			// resolves the user simply dismissed the browser, so stay silent — the
			// root reconciler still recovers any session that did land.
			await ensureSessionResolved()
		} catch (err) {
			Alert.alert('Something went wrong', err instanceof Error ? err.message : 'Please try again.')
		} finally {
			setPending(false)
		}
	}

	return (
		<KeyboardAwareScrollView
			contentContainerClassName="p-5 gap-4"
			keyboardDismissMode="on-drag"
			keyboardShouldPersistTaps="handled"
			contentInsetAdjustmentBehavior="automatic"
		>
			<View className="gap-1 pt-1">
				<Text className="font-display text-title text-foreground">
					{isSignUp ? 'Create your account' : 'Welcome back'}
				</Text>
				<Typography.Paragraph color="muted" className="text-[15px]">
					{isSignUp
						? 'Save your progress and file with confidence.'
						: 'Sign in to pick up right where you left off.'}
				</Typography.Paragraph>
			</View>

			<View className="gap-3">
				{SOCIAL_PROVIDERS.map((provider) => (
					<SocialAuthButton
						key={provider}
						provider={provider}
						isDisabled={pending}
						onPress={() => handleSocialAuth(provider)}
					/>
				))}
			</View>

			<View className="flex-row items-center gap-4">
				<Separator className="flex-1" />
				<Typography.Paragraph color="muted" className="text-sm">
					or continue with email
				</Typography.Paragraph>
				<Separator className="flex-1" />
			</View>

			<View className="gap-4">
				{isSignUp ? (
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
				) : null}

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
						textContentType={isSignUp ? 'newPassword' : 'password'}
						editable={!pending}
						onSubmitEditing={handleEmailAuth}
						submitBehavior="submit"
						returnKeyType="done"
					/>
				</TextField>

				<Button isDisabled={pending} onPress={handleEmailAuth}>
					<Button.Label>
						{pending
							? isSignUp
								? 'Creating account…'
								: 'Signing in…'
							: isSignUp
								? 'Create account'
								: 'Sign in'}
					</Button.Label>
				</Button>

				<Button
					variant="ghost"
					isDisabled={pending}
					onPress={() => setMode(isSignUp ? 'sign-in' : 'sign-up')}
				>
					<Button.Label>
						{isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
					</Button.Label>
				</Button>
			</View>
		</KeyboardAwareScrollView>
	)
}
