import { router } from 'expo-router'
import { Button, Spinner, Typography } from 'heroui-native'
import { View } from 'react-native'
import { useRecentDocuments } from './documents.data'
import { DocumentRow } from './documents.row'

/** How many recent documents the Vault surfaces before "Browse all". */
const RECENT_LIMIT = 5

/**
 * The account holder's most recently uploaded documents (across every applicant),
 * capped at RECENT_LIMIT, with a "Browse all" affordance to the full paginated
 * list. Each row reuses DocumentRow (open/delete) so the recent list and the
 * Browse-all page stay identical. "Browse all" appears only when the cap is hit,
 * i.e. more documents likely exist beyond what's shown here.
 */
export function RecentDocuments() {
	const documents = useRecentDocuments(RECENT_LIMIT)

	return (
		<View className="gap-3">
			<View className="flex-row items-center justify-between">
				<Typography.Heading className="text-lg font-bold">Recent documents</Typography.Heading>
				{documents && documents.length === RECENT_LIMIT ? (
					<Button size="sm" variant="ghost" onPress={() => router.push('/vault/documents')}>
						<Button.Label>Browse all</Button.Label>
					</Button>
				) : null}
			</View>

			{documents === undefined ? (
				<View className="items-center py-8">
					<Spinner />
				</View>
			) : documents.length === 0 ? (
				<Typography.Paragraph color="muted" className="py-6 text-center">
					No documents yet. Upload one above to get started.
				</Typography.Paragraph>
			) : (
				<View className="gap-2">
					{documents.map((document) => (
						<DocumentRow key={document._id} document={document} />
					))}
				</View>
			)}
		</View>
	)
}
