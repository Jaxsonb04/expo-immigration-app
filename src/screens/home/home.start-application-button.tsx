import { useRouter } from 'expo-router'
import { Button } from 'heroui-native'
import type { ComponentProps } from 'react'

export function StartApplicationButton(props: {
	variant?: ComponentProps<typeof Button>['variant']
}) {
	const router = useRouter()
	return (
		<Button variant={props.variant} onPress={() => router.push('/new-application')}>
			<Button.Label>Start an application</Button.Label>
		</Button>
	)
}
