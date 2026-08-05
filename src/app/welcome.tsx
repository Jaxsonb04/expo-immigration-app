import { CaseTrackingHero } from '@/components/core'
import { establishAnonymousSession } from '@/lib/anonymous-session'
import { authClient } from '@/lib/auth-client'
import { waitForAuthenticatedOrUnmounted } from '@/lib/auth-transition'
import { ensureSessionResolved, getPersistedSessionCookie } from '@/lib/session-sync'
import { TEMP_ACCOUNT_START_DISCLOSURE } from '@/lib/temp-account-notice'
import { useConvexAuth } from 'convex/react'
import { useRouter } from 'expo-router'
import { Button } from 'heroui-native'
import { useEffect, useRef, useState } from 'react'
import {
	Alert,
	Linking,
	Pressable,
	ScrollView,
	Text,
	useWindowDimensions,
	View,
} from 'react-native'
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated'

/**
 * Anonymous-first entry point (ADR-0009). Continue creates a temporary Better
 * Auth session for browsing the stable release surfaces. Persistent case writes
 * remain account-gated; returning users can open the dedicated sign-in screen.
 */

const PRIVACY_POLICY_URL =
	process.env.EXPO_PUBLIC_PRIVACY_URL ?? 'https://jaxsonb04.github.io/expo-immigration-app/privacy/'

const rise = (order: number) =>
	FadeInDown.duration(320)
		.delay(120 + order * 90)
		.reduceMotion(ReduceMotion.System)

export default function WelcomeScreen() {
	const router = useRouter()
	const { isAuthenticated } = useConvexAuth()
	const { height, fontScale } = useWindowDimensions()
	const [pending, setPending] = useState(false)
	const mountedRef = useRef(true)
	const convexAuthenticatedRef = useRef(isAuthenticated)
	const showsScrollIndicator = height < 750 || fontScale > 1.2

	useEffect(() => {
		mountedRef.current = true
		return () => {
			mountedRef.current = false
		}
	}, [])

	useEffect(() => {
		convexAuthenticatedRef.current = isAuthenticated
	}, [isAuthenticated])

	async function handleContinue(): Promise<void> {
		setPending(true)
		try {
			const session = await establishAnonymousSession({
				hasPersistedCookie: () => !!getPersistedSessionCookie(),
				resolveSession: ensureSessionResolved,
				signInAnonymously: () => authClient.signIn.anonymous(),
			})
			if (!session.ok) {
				Alert.alert("Couldn't start", session.message)
				return
			}

			// Better Auth owning a session is only the first half of the handoff.
			// Stay pending until Convex accepts that session's JWT and the
			// protected route swaps to the retained tabs (which unmounts this screen).
			const enteredApp = await waitForAuthenticatedOrUnmounted({
				isAuthenticated: () => convexAuthenticatedRef.current,
				isMounted: () => mountedRef.current,
			})
			if (!enteredApp) {
				Alert.alert("Couldn't start", "We couldn't finish loading your session. Please try again.")
			}
		} catch (err) {
			Alert.alert('Something went wrong', err instanceof Error ? err.message : 'Please try again.')
		} finally {
			if (mountedRef.current) setPending(false)
		}
	}

	async function openPrivacyPolicy(): Promise<void> {
		try {
			await Linking.openURL(PRIVACY_POLICY_URL)
		} catch {
			Alert.alert(
				'Could not open the privacy policy',
				'Please try again when you have a connection.',
			)
		}
	}

	return (
		<ScrollView
			className="flex-1 bg-background"
			contentContainerStyle={{ flexGrow: 1 }}
			showsVerticalScrollIndicator={showsScrollIndicator}
			bounces={false}
		>
			<View className="flex-1 items-center justify-end pt-safe">
				<Animated.View entering={rise(0)}>
					<CaseTrackingHero width={168} />
				</Animated.View>
			</View>

			<View className="gap-gutter px-section pt-9">
				<Animated.View entering={rise(1)} className="gap-gutter">
					<Text className="font-display text-display text-foreground">
						Keep your case{'\n'}close at hand.
					</Text>
					<Text className="font-normal text-[17px] leading-relaxed text-muted">
						Save USCIS receipt numbers, record the updates you receive, and open official government
						tools from one calm place.
					</Text>
					<View className="rounded-2xl border border-warning/30 bg-warning/10 px-card py-control">
						<Text className="font-medium text-sm leading-relaxed text-foreground">
							{TEMP_ACCOUNT_START_DISCLOSURE}
						</Text>
					</View>
				</Animated.View>
			</View>

			<Animated.View entering={rise(2)} className="gap-control px-section pt-10 pb-safe-offset-6">
				<Button size="lg" isDisabled={pending} onPress={handleContinue}>
					<Button.Label maxFontSizeMultiplier={1.5}>
						{pending ? 'Opening…' : 'Continue'}
					</Button.Label>
				</Button>
				<Button
					size="lg"
					variant="ghost"
					isDisabled={pending}
					onPress={() => router.push('/sign-in')}
				>
					<Button.Label maxFontSizeMultiplier={1.5}>Sign in</Button.Label>
				</Button>
				<Pressable
					accessibilityRole="link"
					accessibilityLabel="Open Immifile privacy policy"
					className="self-center px-control py-tight"
					hitSlop={8}
					onPress={() => void openPrivacyPolicy()}
				>
					<Text className="font-medium text-sm text-accent underline">Privacy policy</Text>
				</Pressable>
			</Animated.View>
		</ScrollView>
	)
}
