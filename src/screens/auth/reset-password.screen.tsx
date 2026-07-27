import { authClient } from '@/lib/auth-client'
import {
	PASSWORD_RECOVERY_ENABLED,
	firstSearchParam,
	validateNewPassword,
} from '@/lib/password-recovery'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Button, Input, Label, TextField, Typography } from 'heroui-native'
import { useState } from 'react'
import { Alert, View } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'

export function ResetPasswordScreen() {
	const router = useRouter()
	const params = useLocalSearchParams<{
		token?: string | string[]
		error?: string | string[]
	}>()
	const token = firstSearchParam(params.token)
	const linkError = firstSearchParam(params.error)
	const [password, setPassword] = useState('')
	const [confirmation, setConfirmation] = useState('')
	const [pending, setPending] = useState(false)
	const [complete, setComplete] = useState(false)

	const linkIsValid = PASSWORD_RECOVERY_ENABLED && token !== null && linkError === null

	async function resetPassword(): Promise<void> {
		if (!linkIsValid || token === null) return
		const validationError = validateNewPassword(password, confirmation)
		if (validationError) {
			Alert.alert('Check your password', validationError)
			return
		}

		setPending(true)
		try {
			const { error } = await authClient.resetPassword({
				newPassword: password,
				token,
			})
			if (error) {
				throw new Error(error.message ?? 'This reset link is invalid or has expired.')
			}
			setComplete(true)
			setPassword('')
			setConfirmation('')
		} catch (error) {
			Alert.alert(
				'Could not reset password',
				error instanceof Error ? error.message : 'Please request a new reset link.',
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
					{complete ? 'Password updated' : 'Choose a new password'}
				</Typography.Heading>
				<Typography.Paragraph color="muted" className="leading-relaxed">
					{complete
						? 'Your previous sessions were signed out. Return to sign in with the new password.'
						: linkIsValid
							? 'Use between 8 and 128 characters. Resetting signs out every existing session for this account.'
							: 'This reset link is unavailable, invalid, or expired. Return to sign in and request a new link.'}
				</Typography.Paragraph>
			</View>

			{complete ? (
				<Button onPress={() => router.replace('/sign-in')}>
					<Button.Label>Return to sign in</Button.Label>
				</Button>
			) : linkIsValid ? (
				<View className="gap-card">
					<TextField>
						<Label>New password</Label>
						<Input
							value={password}
							onChangeText={setPassword}
							placeholder="••••••••"
							secureTextEntry
							autoCapitalize="none"
							autoComplete="new-password"
							textContentType="newPassword"
							editable={!pending}
						/>
					</TextField>
					<TextField>
						<Label>Confirm new password</Label>
						<Input
							value={confirmation}
							onChangeText={setConfirmation}
							placeholder="••••••••"
							secureTextEntry
							autoCapitalize="none"
							autoComplete="new-password"
							textContentType="newPassword"
							editable={!pending}
							onSubmitEditing={resetPassword}
							submitBehavior="submit"
							returnKeyType="done"
						/>
					</TextField>
					<Button isDisabled={pending} onPress={resetPassword}>
						<Button.Label>{pending ? 'Updating…' : 'Update password'}</Button.Label>
					</Button>
				</View>
			) : (
				<Button variant="secondary" onPress={() => router.replace('/sign-in')}>
					<Button.Label>Return to sign in</Button.Label>
				</Button>
			)}
		</KeyboardAwareScrollView>
	)
}
