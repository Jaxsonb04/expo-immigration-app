import { ModalHeader } from '@/components/core'
import { NewPostScreen } from '@/screens/community'
import { View } from 'react-native'

/** M7-T7: every modal opens under the shared header — title, safe-area top
 * padding, and an always-visible close. */
export default function NewPostRoute() {
	return (
		<View className="flex-1 bg-background">
			<ModalHeader title="Start a post" />
			<NewPostScreen />
		</View>
	)
}
