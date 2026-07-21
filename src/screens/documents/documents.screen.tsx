import { BodyScrollView } from '@/components/core'
import { Spinner } from 'heroui-native'
import { View } from 'react-native'
import { VaultProvider } from './documents.context'
import { useVault } from './documents.data'
import { NeededDocuments } from './documents.needed'
import { RenewalReminders } from './documents.reminders'
import { VaultDocuments } from './documents.vault'

/**
 * `basePath` is the caller's own stack prefix (`/documents` under Forms,
 * `/account/documents` under Account) — this same screen mounts in both tabs
 * (M7-T3), and a document row's push must stay inside whichever one is
 * showing, never yank the user across tabs to see their own detail.
 */
export function DocumentsScreen({ basePath }: { basePath: string }) {
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
					<VaultDocuments.List basePath={basePath} />
				</View>
			</BodyScrollView>
		</VaultProvider>
	)
}
