import { authClient } from '@/lib/auth-client'
import { Button, Input, Label, Separator, TextField, Typography } from 'heroui-native'
import { SocialAuthButton, type SocialAuthButtonProvider } from 'heroui-native-pro'
import { useState } from 'react'
import { Alert, View } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'

type Mode = 'sign-in' | 'sign-up'

// Constrain to providers that both heroui-native-pro renders an icon for and
// Better Auth supports as social providers.
type SocialProvider = Extract<SocialAuthButtonProvider, 'google' | 'apple' | 'github'>

const SOCIAL_PROVIDERS: SocialProvider[] = ['google', 'apple', 'github']

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
			}
			// On success the Convex auth state flips to authenticated and the
			// protected route in the root layout redirects into the app — there is
			// no manual navigation to do here.
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
			}
		} catch (err) {
			Alert.alert('Something went wrong', err instanceof Error ? err.message : 'Please try again.')
		} finally {
			setPending(false)
		}
	}

	return (
		<KeyboardAwareScrollView
			contentContainerClassName="p-5 gap-3"
			keyboardDismissMode="on-drag"
			keyboardShouldPersistTaps="handled"
			contentInsetAdjustmentBehavior="automatic"
		>
			<View>
				<Typography.Heading className="text-3xl font-bold">
					{isSignUp ? 'Create your account' : 'Welcome back'}
				</Typography.Heading>
				<Typography.Paragraph color="muted">
					{isSignUp
						? 'Sign up to start tracking your immigration journey.'
						: 'Sign in to continue your immigration journey.'}
				</Typography.Paragraph>
			</View>
			{SOCIAL_PROVIDERS.map((provider) => (
				<SocialAuthButton
					key={provider}
					provider={provider}
					isDisabled={pending}
					onPress={() => handleSocialAuth(provider)}
				/>
			))}

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
