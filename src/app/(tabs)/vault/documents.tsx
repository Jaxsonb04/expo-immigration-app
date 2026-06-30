import { Stack } from 'expo-router'
import { useThemeColor } from 'heroui-native'
import { DocumentsList } from '@/components/documents'

export default function VaultDocumentsRoute() {
	const themeColorForeground = useThemeColor('foreground')
	return (
		<>
			<Stack.Title
				large
				largeStyle={{
					fontFamily: 'Fredoka_600SemiBold',
					color: themeColorForeground,
				}}
			>
				Documents
			</Stack.Title>
			<DocumentsList />
		</>
	)
}
