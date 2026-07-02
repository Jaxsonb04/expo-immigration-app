import { ConvexBetterAuthProvider, type AuthClient } from '@convex-dev/better-auth/react'
import {
	Montserrat_400Regular,
	Montserrat_500Medium,
	Montserrat_600SemiBold,
	Montserrat_700Bold,
	useFonts,
} from '@expo-google-fonts/montserrat'
import { ConvexReactClient } from 'convex/react'
import { StatusBar } from 'expo-status-bar'
import { HeroUINativeProvider } from 'heroui-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

import { AccountGateProvider } from '@/components/account'
import { authClient } from '@/lib/auth-client'
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router'
import { useCallback } from 'react'
import { KeyboardAvoidingView, Platform } from 'react-native'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import { useUniwind } from 'uniwind'

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
	// expectAuth: true,
	unsavedChangesWarning: false,
})

/**
 * Component that wraps app content inside KeyboardProvider
 * Contains the contentWrapper and HeroUINativeProvider configuration
 */
function AppContent({ children }: { children: React.ReactNode }) {
	const { theme } = useUniwind()
	const contentWrapper = useCallback(
		(children: React.ReactNode) => (
			<KeyboardAvoidingView
				pointerEvents="box-none"
				behavior="padding"
				keyboardVerticalOffset={12}
				className="flex-1"
			>
				{children}
			</KeyboardAvoidingView>
		),
		[],
	)

	return (
		<ThemeProvider value={theme === 'dark' ? DarkTheme : DefaultTheme}>
			<HeroUINativeProvider
				config={{
					...(Platform.OS !== 'web' && { toast: { contentWrapper } }),
					devInfo: {
						stylingPrinciples: false,
					},
				}}
			>
				<AccountGateProvider>{children}</AccountGateProvider>
			</HeroUINativeProvider>
		</ThemeProvider>
	)
}

export function Providers({ children }: { children: React.ReactNode }) {
	const [fontsLoaded] = useFonts({
		Montserrat_400Regular,
		Montserrat_500Medium,
		Montserrat_600SemiBold,
		Montserrat_700Bold,
	})

	if (!fontsLoaded) {
		return null
	}

	// Cast required: the provider's `AuthClient` type infers `useSession().data`
	// as `never`, so a concrete client (with the expo plugin) isn't structurally
	// assignable. Call-site inference on `authClient.*` is unaffected.
	return (
		<ConvexBetterAuthProvider client={convex} authClient={authClient as unknown as AuthClient}>
			<GestureHandlerRootView style={{ flex: 1 }}>
				<KeyboardProvider>
					<AppContent>
						{children}
						<StatusBar style="auto" />
					</AppContent>
				</KeyboardProvider>
			</GestureHandlerRootView>
		</ConvexBetterAuthProvider>
	)
}
