import { DocumentsScreen } from '@/screens/documents'
import { Stack } from 'expo-router'

/** The Document Vault reached from the Account tab (M7-T3). The same screen
 * also lives at /documents under Forms — each tab keeps its own stack so
 * opening the vault never yanks the user to another tab. */
export default function AccountDocumentsRoute() {
	return (
		<>
			<Stack.Title>Documents</Stack.Title>
			<DocumentsScreen basePath="/account/documents" />
		</>
	)
}
