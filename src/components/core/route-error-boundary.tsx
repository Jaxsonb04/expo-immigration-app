import { humanErrorMessage } from '@/lib/error-message'
import type { ErrorBoundaryProps } from 'expo-router'
import { ScreenError } from './screen-state'

/**
 * The screen someone actually sees when a route throws.
 *
 * Without this, Expo Router falls back to its built-in boundary, which renders
 * an unstyled "Something went wrong / Error: <raw message>" page — and the raw
 * message is whatever the server threw, e.g. a Convex transport string or
 * "Account deletion is in progress". Neither the look nor the wording belongs
 * in a shipping app, so this reuses the app's own error state and never prints
 * the raw error: `humanErrorMessage` extracts the human sentence a handler
 * wrote and falls back to calm copy for transport noise and non-Error throws.
 */
export function RouteErrorBoundary({ error, retry }: ErrorBoundaryProps) {
	return (
		<ScreenError
			description={humanErrorMessage(
				error,
				'Immifile could not load this screen. Your saved cases are unaffected.',
			)}
			onRetry={() => void retry()}
		/>
	)
}
