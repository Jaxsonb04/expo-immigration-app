import { Button } from 'heroui-native'
import { View } from 'react-native'
import { useInterview } from './interview.context'

/** Back/Next controls; Next validates-then-saves (no autosave). In single-step
 * edit mode the labels read Cancel / Save, since there is nothing to advance to. */
export function Footer() {
	const { saving, isLast, singleStep, next, back } = useInterview()
	const primaryLabel = saving ? 'Saving…' : singleStep ? 'Save' : isLast ? 'Finish' : 'Next'
	return (
		<View className="flex-row gap-control px-gutter pb-safe-offset-4 pt-tight">
			<Button variant="ghost" className="flex-1" isDisabled={saving} onPress={back}>
				<Button.Label>{singleStep ? 'Cancel' : 'Back'}</Button.Label>
			</Button>
			<Button className="flex-[2]" isDisabled={saving} onPress={next}>
				<Button.Label>{primaryLabel}</Button.Label>
			</Button>
		</View>
	)
}
