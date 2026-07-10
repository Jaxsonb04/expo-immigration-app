import { FilingStackHero } from '@/components/core'
import { authClient } from '@/lib/auth-client'
import { useRouter } from 'expo-router'
import { Button } from 'heroui-native'
import { useState } from 'react'
import { Alert, Text, View } from 'react-native'
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated'

/**
 * Anonymous-first entry point (ADR-0009). "Start filing" silently creates an
 * anonymous Better Auth session — no form, no "guest" wording — and the root
 * guard in `_layout.tsx` flips to the authenticated group, dropping the user
 * straight into the tabs. Returning users push the dedicated sign-in screen.
 *
 * This screen is the design system's proving ground: warm paper ground,
 * Fraunces display type, one terracotta accent, generous whitespace. The hero
 * is a code-drawn stack of filing cards with a calm, continuous idle (see
 * `FilingStackHero`); the surrounding content enters as a single staggered
 * fade/rise (transform + opacity only), and `ReduceMotion.System` collapses
 * every animation to an instant appearance when Reduce Motion is enabled.
 */

const rise = (order: number) =>
	FadeInDown.duration(320)
		.delay(120 + order * 90)
		.reduceMotion(ReduceMotion.System)

export default function WelcomeScreen() {
	const router = useRouter()
	const [pending, setPending] = useState(false)

	async function handleStartFiling(): Promise<void> {
		setPending(true)
		try {
			let { error } = await authClient.signIn.anonymous()
			if (error) {
				// A half-cleared session (e.g. right after deleting an account) makes
				// the anonymous plugin refuse to sign in again ("anonymous users
				// cannot sign in again anonymously"). Clear whatever session is left
				// and retry once — this screen only ever shows signed-out users.
				try {
					await authClient.signOut()
				} catch {
					// Best effort — the retry below reports the real failure.
				}
				;({ error } = await authClient.signIn.anonymous())
			}
			if (error) {
				Alert.alert("Couldn't start", error.message ?? 'Please try again in a moment.')
			}
			// On success the Convex auth state flips to authenticated and the
			// protected route in the root layout redirects into the tabs — there is
			// no manual navigation to do here.
		} catch (err) {
			Alert.alert('Something went wrong', err instanceof Error ? err.message : 'Please try again.')
		} finally {
			setPending(false)
		}
	}

	return (
		<View className="flex-1 bg-background">
			{/* The filing stack floats on the paper ground itself — no tinted box. */}
			<View className="flex-1 items-center justify-end pt-safe">
				<Animated.View entering={rise(0)}>
					<FilingStackHero width={168} />
				</Animated.View>
			</View>

			<View className="gap-5 px-6 pt-9">
				<Animated.View entering={rise(1)} className="gap-5">
					<Text className="font-display text-display text-foreground">
						Renew with{'\n'}confidence.
					</Text>
					<Text className="font-normal text-[17px] leading-relaxed text-muted">
						Immifile walks you through your work permit or green card renewal — deadlines,
						documents, and a print-ready filing, step by step. Create an account only when
						you’re ready.
					</Text>
				</Animated.View>
			</View>

			<Animated.View entering={rise(2)} className="gap-3 px-6 pt-10 pb-safe-offset-6">
				<Button size="lg" isDisabled={pending} onPress={handleStartFiling}>
					<Button.Label>{pending ? 'Starting…' : 'Start filing'}</Button.Label>
				</Button>
				<Button size="lg" variant="ghost" isDisabled={pending} onPress={() => router.push('/sign-in')}>
					<Button.Label>I already have an account</Button.Label>
				</Button>
			</Animated.View>
		</View>
	)
}
