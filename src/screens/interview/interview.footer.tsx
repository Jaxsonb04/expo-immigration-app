import { Button } from 'heroui-native'
import { View } from 'react-native'
import { useInterview } from './interview.context'

/** Back/Next controls; Next validates-then-saves (no autosave). */
export function Footer() {
	const { saving, isLast, next, back } = useInterview()
	return (
		<View className="flex-row gap-3 px-5 pb-safe-offset-4 pt-2">
			<Button variant="ghost" className="flex-1" isDisabled={saving} onPress={back}>
				<Button.Label>Back</Button.Label>
			</Button>
			<Button className="flex-[2]" isDisabled={saving} onPress={next}>
				<Button.Label>{saving ? 'Saving…' : isLast ? 'Finish' : 'Next'}</Button.Label>
			</Button>
		</View>
	)
}
