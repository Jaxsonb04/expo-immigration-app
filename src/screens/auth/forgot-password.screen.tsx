import { authClient } from '@/lib/auth-client'
import { PASSWORD_RECOVERY_ENABLED, PASSWORD_RESET_REDIRECT_URL } from '@/lib/password-recovery'
import { Button, Input, Label, TextField, Typography } from 'heroui-native'
import { useState } from 'react'
import { Alert, View } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'

export function ForgotPasswordScreen() {
	const [email, setEmail] = useState('')
	const [pending, setPending] = useState(false)
	const [sent, setSent] = useState(false)

	async function requestReset(): Promise<void> {
		if (!PASSWORD_RECOVERY_ENABLED) return
		if (!email.trim()) {
			Alert.alert('Email required', 'Enter the email address you use for Immifile.')
			return
		}

		setPending(true)
		try {
			const { error } = await authClient.requestPasswordReset({
				email: email.trim(),
				redirectTo: PASSWORD_RESET_REDIRECT_URL,
			})
			if (error) {
				throw new Error(error.message ?? 'The reset request could not be completed.')
			}
			// Keep the response identical whether or not an account exists.
			setSent(true)
		} catch (error) {
			Alert.alert(
				'Could not request a reset',
				error instanceof Error ? error.message : 'Please try again.',
			)
		} finally {
			setPending(false)
		}
	}

	return (
		<KeyboardAwareScrollView
			contentContainerClassName="p-gutter gap-section"
			keyboardDismissMode="on-drag"
			keyboardShouldPersistTaps="handled"
			contentInsetAdjustmentBehavior="automatic"
		>
			<View className="gap-tight">
				<Typography.Heading className="text-xl font-semibold">
					Reset your password
				</Typography.Heading>
				<Typography.Paragraph color="muted" className="leading-relaxed">
					{PASSWORD_RECOVERY_ENABLED
						? 'Enter your account email. If it matches an account, we will send a secure link that expires in one hour.'
						: 'Password recovery is not configured in this build. Do not release this build until the production email service is verified.'}
				</Typography.Paragraph>
			</View>

			{PASSWORD_RECOVERY_ENABLED ? (
				<View className="gap-card">
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
							editable={!pending && !sent}
							onSubmitEditing={requestReset}
							submitBehavior="submit"
							returnKeyType="send"
						/>
					</TextField>

					{sent ? (
						<View className="rounded-2xl border border-success/30 bg-success/10 p-card">
							<Typography.Paragraph className="leading-relaxed">
								If that email matches an Immifile account, a reset link is on its way. Check your
								inbox and spam folder.
							</Typography.Paragraph>
						</View>
					) : (
						<Button isDisabled={pending} onPress={requestReset}>
							<Button.Label>{pending ? 'Sending…' : 'Send reset link'}</Button.Label>
						</Button>
					)}
				</View>
			) : null}
		</KeyboardAwareScrollView>
	)
}
