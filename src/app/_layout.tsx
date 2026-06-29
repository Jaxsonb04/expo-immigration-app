import { useConvexAuth } from 'convex/react'
import { Stack } from 'expo-router'
import { Spinner } from 'heroui-native'
import type { JSX } from 'react'
import { View } from 'react-native'

import { Providers } from '@/components/providers'
import { useLayoutStyle } from '@/hooks/use-layout-style'
import '../global.css'

export default function RootLayout(): JSX.Element {
	return (
		<Providers>
			<AppContent />
		</Providers>
	)
}

const AppContent = (): JSX.Element => {
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
			{/* Expo Router swaps the active group whenever `isAuthenticated` changes
			    and clears the now-guarded routes from history. */}
			<Stack.Protected guard={isAuthenticated}>
				<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
			</Stack.Protected>
			<Stack.Protected guard={!isAuthenticated}>
				<Stack.Screen name="auth" options={{ headerShown: false }} />
			</Stack.Protected>
		</Stack>
	)
}
