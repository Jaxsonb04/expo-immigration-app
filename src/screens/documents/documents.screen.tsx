import { BodyScrollView } from '@/components/core'
import { Spinner } from 'heroui-native'
import { View } from 'react-native'
import { VaultProvider } from './documents.context'
import { useVault } from './documents.data'
import { NeededDocuments } from './documents.needed'
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
			<BodyScrollView contentContainerClassName="gap-6 pt-4">
				{vault.neededSlots.length > 0 && (
					<View className="gap-1">
						<NeededDocuments.Heading />
						<NeededDocuments.List />
					</View>
				)}

				<View className="gap-1">
					<VaultDocuments.Heading />
					<VaultDocuments.List />
				</View>
			</BodyScrollView>
		</VaultProvider>
	)
}
