import { ModalHeader } from '@/components/core'
import { CommunityModerationScreen } from '@/screens/community'
import { View } from 'react-native'

/** M7-T7: every modal opens under the shared header — title, safe-area top
 * padding, and an always-visible close. */
export default function CommunityModerationRoute() {
	return (
		<View className="flex-1 bg-background">
			<ModalHeader title="Moderation queue" />
			<CommunityModerationScreen />
		</View>
	)
}
