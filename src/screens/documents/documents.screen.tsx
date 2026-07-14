import { BodyScrollView } from '@/components/core'
import { Spinner } from 'heroui-native'
import { View } from 'react-native'
import { VaultProvider } from './documents.context'
import { useVault } from './documents.data'
import { NeededDocuments } from './documents.needed'
import { RenewalReminders } from './documents.reminders'
import { VaultDocuments } from './documents.vault'

export function DocumentsScreen() {
	const vault = useVault()

	if (vault === undefined) {
		return (
			<View className="flex-1 items-center justify-center bg-background">
				<Spinner />
			</View>
		)
	}

	return (
		<VaultProvider vault={vault}>
			<BodyScrollView contentContainerClassName="gap-section pt-card">
				<RenewalReminders />

				{vault.neededSlots.length > 0 && (
					<View className="gap-hairline">
						<NeededDocuments.Heading />
						<NeededDocuments.List />
					</View>
				)}

				<View className="gap-hairline">
					<VaultDocuments.Heading />
					<VaultDocuments.List />
				</View>
			</BodyScrollView>
		</VaultProvider>
	)
}
