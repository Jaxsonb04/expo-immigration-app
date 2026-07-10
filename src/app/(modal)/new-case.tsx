import { ModalHeader } from '@/components/core'
import { NewCaseScreen } from '@/screens/cases'
import { View } from 'react-native'

/** M7-T7: every modal opens under the shared header — title, safe-area top
 * padding, and an always-visible close. */
export default function NewCaseRoute() {
	return (
		<View className="flex-1 bg-background">
			<ModalHeader title="Track a case" />
			<NewCaseScreen />
		</View>
	)
}
