import { ModalHeader } from '@/components/core'
import { UpgradeScreen } from '@/components/account'
import { View } from 'react-native'

/** M7-T7: every modal opens under the shared header — title, safe-area top
 * padding, and an always-visible close. */
export default function UpgradeRoute() {
	return (
		<View className="flex-1 bg-background">
			<ModalHeader title="Create your account" />
			<UpgradeScreen />
		</View>
	)
}
