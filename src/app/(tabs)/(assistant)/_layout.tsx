import { useLayoutStyle } from '@/hooks/use-layout-style'
import { Stack } from 'expo-router'

export default function AssistantLayout() {
	const layoutStyle = useLayoutStyle()
	return <Stack screenOptions={layoutStyle} />
}
