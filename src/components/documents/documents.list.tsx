import { FlashList } from '@shopify/flash-list'
import { Spinner, Typography } from 'heroui-native'
import { View } from 'react-native'
import { usePaginatedDocuments } from './documents.data'
import { DocumentRow } from './documents.row'

const CONTENT_PADDING = { paddingHorizontal: 20, paddingVertical: 16 }

/** Vertical gap between rows (FlashList separators aren't part of the row card). */
function RowSeparator() {
	return <View className="h-2" />
}

/**
 * The full, paginated list of the account holder's documents across every
 * applicant — the "Browse all" destination. Streams pages with Convex's
 * `usePaginatedQuery` and renders them in a FlashList, loading the next page as
 * the user nears the end. Each row reuses DocumentRow (open/delete).
 */
export function DocumentsList() {
	const { results, status, loadMore } = usePaginatedDocuments()

	if (status === 'LoadingFirstPage') {
		return (
			<View className="flex-1 items-center justify-center bg-background">
				<Spinner />
			</View>
		)
	}

	return (
		<View className="flex-1 bg-background">
			<FlashList
				data={results}
				keyExtractor={(item) => item._id}
				renderItem={({ item }) => <DocumentRow document={item} />}
				ItemSeparatorComponent={RowSeparator}
				contentContainerStyle={CONTENT_PADDING}
				onEndReached={() => {
					if (status === 'CanLoadMore') {
						loadMore(20)
					}
				}}
				onEndReachedThreshold={0.5}
				ListEmptyComponent={
					<Typography.Paragraph color="muted" className="py-10 text-center">
						No documents yet.
					</Typography.Paragraph>
				}
				ListFooterComponent={
					status === 'LoadingMore' ? (
						<View className="items-center py-6">
							<Spinner />
						</View>
					) : null
				}
			/>
		</View>
	)
}
