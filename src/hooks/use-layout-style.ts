import type { ExtendedStackNavigationOptions } from 'expo-router/build/layouts/StackClient'
import type { NativeTabsProps } from 'expo-router/unstable-native-tabs'
import { colorKit, useThemeColor } from 'heroui-native'
import { Platform } from 'react-native'

/**
 * A hook to get the layout style for the app
 */
export const useLayoutStyle = () => {
	const [themeColorForeground, themeColorBackground, themeColorMuted] = useThemeColor([
		'foreground',
		'background',
		'muted',
	])
	const webHeaderConfig = {
		headerTransparent: false,
		headerStyle: {
			backgroundColor: themeColorBackground,
		},
	}
	const iosHeaderConfig = {
		headerTransparent: true,
		headerStyle: {
			backgroundColor: 'transparent',
		},
	}
	const androidHeaderConfig = {
		headerTransparent: false,
		headerStyle: {
			backgroundColor: themeColorBackground,
		},
	}
	const headerConfig = Platform.select({
		ios: iosHeaderConfig,
		android: androidHeaderConfig,
		default: webHeaderConfig,
	})
	return {
		...headerConfig,
		headerTintColor: themeColorForeground,
		contentStyle: {
			backgroundColor: themeColorBackground,
		},
		headerBackButtonDisplayMode: 'generic',
		headerTitleStyle: {
			fontFamily: 'Fredoka_600SemiBold',
		},
		headerShadowVisible: false,
		headerLargeTitleStyle: {
			fontSize: 24,
			color: themeColorMuted,
		},
	} as ExtendedStackNavigationOptions
}

export const useTabLayoutStyle = () => {
	const [
		themeColorMuted,
		themeColorBackground,
		themeColorAccent,
		themeColorAccentForeground,
		themeColorForeground,
	] = useThemeColor(['surface', 'background', 'accent', 'accent-foreground', 'foreground'])
	return {
		tabBarStyle: {
			backgroundColor: Platform.select({
				default: themeColorMuted,
				ios: themeColorBackground,
			}),
			tintColor: themeColorAccent,
			indicatorColor: themeColorAccent,
			labelStyle: {
				default: {
					color: themeColorForeground,
				},
				fontFamily: 'Fredoka_600SemiBold',
				selected: {
					color: themeColorAccent,
				},
			},
			iconColor: {
				selected: Platform.select({
					default: themeColorAccentForeground,
					ios: themeColorAccent,
				}),
			},
			rippleColor: colorKit.setAlpha(themeColorAccentForeground, 0.4).rgb().string(),
			sidebarAdaptable: true,
		} satisfies NativeTabsProps,
	}
}
