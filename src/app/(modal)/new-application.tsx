import { ModalHeader } from '@/components/core'
import { NewApplicationScreen } from '@/screens/applications'
import { View } from 'react-native'

/** M7-T7: every modal opens under the shared header — title, safe-area top
 * padding, and an always-visible close. */
export default function NewApplicationRoute() {
	return (
		<View className="flex-1 bg-background">
			<ModalHeader title="Start an application" />
			<NewApplicationScreen />
		</View>
	)
}
