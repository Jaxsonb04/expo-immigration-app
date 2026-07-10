import { AssistantScreen } from '@/screens/assistant'
import { useThemeColor } from 'heroui-native'
import { Stack } from 'expo-router'

/** The Assistant tab (post-M7 revision, MASTER_PLAN Layout) — the safe
 * navigator lives between Cases and Forum again. The floating "Ask" bubble
 * it replaced sat on top of the Forms and Cases surfaces and was reported
 * as being in the way; a dedicated tab gives it room without crowding
 * either surface. The screen itself — navigator, quota, retry — is
 * unchanged from the bubble sheet. */
export default function AssistantTab() {
	const themeColorForeground = useThemeColor('foreground')
	return (
		<>
			<Stack.Title
				large
				largeStyle={{
					fontFamily: 'Fraunces_600SemiBold',
					color: themeColorForeground,
				}}
			>
				Assistant
			</Stack.Title>

			<AssistantScreen />
		</>
	)
}
