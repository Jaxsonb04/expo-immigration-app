import { useLayoutStyle } from '@/hooks/use-layout-style'
import { Stack } from 'expo-router'

export default function CasesLayout() {
	const layoutStyle = useLayoutStyle()
	return <Stack screenOptions={layoutStyle} />
}
