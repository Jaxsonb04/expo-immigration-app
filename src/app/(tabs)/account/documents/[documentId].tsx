import { DocumentDetailScreen } from '@/screens/documents'
import type { Id } from '@convex/_generated/dataModel'
import { Stack, useLocalSearchParams } from 'expo-router'

export default function AccountDocumentDetailRoute() {
	const { documentId } = useLocalSearchParams<{ documentId: string }>()
	return (
		<>
			<Stack.Title>Document</Stack.Title>
			<DocumentDetailScreen documentId={documentId as Id<'documents'>} />
		</>
	)
}
