import { ModalHeader } from '@/components/core'
import { AssistantScreen } from '@/screens/assistant'
import { View } from 'react-native'

/** The assistant, re-homed from its former tab into a full-height sheet
 * opened by the floating Ask bubble (M7-T2). The surface itself — navigator,
 * quota, retry — is unchanged. */
export default function AssistantSheet() {
	return (
		<View className="flex-1 bg-background">
			{/* The not-legal-advice disclaimer stays pinned by the composer inside
			    the screen, so the header keeps a single clear job: title + close. */}
			<ModalHeader title="Assistant" />
			<AssistantScreen />
		</View>
	)
}
