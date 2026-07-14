import { styledIcon } from '@/components/styled-icon'
import { Typography } from 'heroui-native'
import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { useInterview } from './interview.context'

const HelpIcon = styledIcon({ family: 'lucide', name: 'circle-help' })

/**
 * One friendly question per screen with contextual help on every step
 * (ADR-0012): big heading plus a "?" toggle for the help text.
 */
export function Question() {
	const { step } = useInterview()
	const [helpVisible, setHelpVisible] = useState(false)

	return (
		<View className="gap-card">
			<View className="flex-row items-start gap-control">
				<Typography.Heading className="flex-1 text-3xl font-semibold leading-9">
					{step.question}
				</Typography.Heading>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Show help for this question"
					hitSlop={8}
					className="pt-hairline"
					onPress={() => setHelpVisible((visible) => !visible)}
				>
					<HelpIcon size={22} className={helpVisible ? 'text-accent' : 'text-muted'} />
				</Pressable>
			</View>

			{helpVisible && (
				<View className="rounded-xl bg-accent/10 p-card">
					<Typography.Paragraph className="text-sm leading-5">{step.help}</Typography.Paragraph>
				</View>
			)}
		</View>
	)
}
