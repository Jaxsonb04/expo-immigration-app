import { ConvexBetterAuthProvider, type AuthClient } from '@convex-dev/better-auth/react'
import {
	Fredoka_400Regular,
	Fredoka_500Medium,
	Fredoka_600SemiBold,
	Fredoka_700Bold,
	useFonts,
} from '@expo-google-fonts/fredoka'
import { ConvexReactClient } from 'convex/react'
import { StatusBar } from 'expo-status-bar'
import { HeroUINativeProvider } from 'heroui-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

import { authClient } from '@/lib/auth-client'

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
	// expectAuth: true,
	unsavedChangesWarning: false,
})

export function Providers({ children }: { children: React.ReactNode }) {
	const [fontsLoaded] = useFonts({
		Fredoka_400Regular,
		Fredoka_500Medium,
		Fredoka_600SemiBold,
		Fredoka_700Bold,
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
				<HeroUINativeProvider
					config={{
						devInfo: {
							stylingPrinciples: false,
						},
					}}
				>
					{children}
					<StatusBar style="auto" />
				</HeroUINativeProvider>
			</GestureHandlerRootView>
		</ConvexBetterAuthProvider>
	)
}
