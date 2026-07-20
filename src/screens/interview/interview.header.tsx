import { styledIcon } from '@/components/styled-icon'
import { Typography } from 'heroui-native'
import { Pressable, View } from 'react-native'
import { useInterview } from './interview.context'

const CloseIcon = styledIcon({ family: 'lucide', name: 'x' })

/** Close affordance, progress track, and step counter. In single-step edit
 * mode there is no meaningful progress, so the track and counter are hidden and
 * only the close/cancel affordance remains (the question itself is the title). */
export function Header() {
	const { stepNumber, totalSteps, singleStep, close } = useInterview()
	const progress = Math.max(0.04, (stepNumber - 1) / totalSteps)

	if (singleStep) {
		return (
			<View className="flex-row items-center px-gutter pt-card pb-tight">
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Cancel editing this answer"
					hitSlop={8}
					onPress={close}
				>
					<CloseIcon size={22} className="text-muted" />
				</Pressable>
			</View>
		)
	}

	return (
		<View className="flex-row items-center gap-control px-gutter pt-card pb-tight">
			<Pressable
				accessibilityRole="button"
				accessibilityLabel="Close interview"
				hitSlop={8}
				onPress={close}
			>
				<CloseIcon size={22} className="text-muted" />
			</Pressable>
			<View className="flex-1 h-1.5 rounded-full bg-accent/15 overflow-hidden">
				<View
					className="h-full rounded-full bg-accent"
					style={{ width: `${Math.round(progress * 100)}%` }}
				/>
			</View>
			<Typography.Paragraph color="muted" className="text-sm tabular-nums">
				{stepNumber}/{totalSteps}
			</Typography.Paragraph>
		</View>
	)
}
