import { useConvexAuth } from 'convex/react'
import { Stack } from 'expo-router'
import { Spinner } from 'heroui-native'
import { View } from 'react-native'

import { Providers } from '@/components/providers'
import { useLayoutStyle } from '@/hooks/use-layout-style'
import '../global.css'

export default function RootLayout() {
	return (
		<Providers>
			<AppContent />
		</Providers>
	)
}

const AppContent = () => {
	const layoutStyle = useLayoutStyle()
	const { isLoading, isAuthenticated } = useConvexAuth()

	// Wait for Convex to resolve the persisted session before deciding which
	// route group to show, otherwise the sign-in screen flashes for already
	// authenticated users on cold start.
	if (isLoading) {
		return (
			<View className="flex-1 items-center justify-center bg-background">
				<Spinner />
			</View>
		)
	}

	return (
			<Stack screenOptions={layoutStyle}>
			<Stack.Protected guard={isAuthenticated}>
				<Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Home' }} />
				{/* Root-level modal slots present above the tab bar. */}
				<Stack.Screen
					name="(modal)"
					options={{
						presentation: 'modal',
						animation: 'fade_from_bottom',
						headerShown: false,
					}}
				/>
			</Stack.Protected>
			<Stack.Protected guard={!isAuthenticated}>
				{/*
				 * Anonymous-first onboarding (ADR-0009). `welcome` is the initial
				 * unauthenticated screen ("Start filing" creates an anonymous
				 * session); `sign-in` is pushed from it for returning users. An
				 * anonymous session makes `useConvexAuth().isAuthenticated` true, so
				 * the authenticated group (tabs) takes over with no manual nav.
				 */}
				<Stack.Screen
					name="welcome"
					options={{
						headerShown: false,
					}}
				/>
				<Stack.Screen
					name="sign-in"
					options={{
						headerShown: false,
						title: 'Sign in',
						presentation: 'formSheet',
						sheetAllowedDetents: 'fitToContents',
					}}
				/>
			</Stack.Protected>
		</Stack>
	)
}
