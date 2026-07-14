import { Button, Card, Typography } from 'heroui-native'
import { Text, View } from 'react-native'
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated'

import { styledIcon } from '@/components/styled-icon'

import type { AssistantContent } from './assistant.types'

type RecommendationContent = Extract<AssistantContent, { kind: 'recommendation' }>

type RecommendationCardProps = {
	content: RecommendationContent
	onStart: (content: RecommendationContent) => void
	isDisabled?: boolean
}

const FormIcon = styledIcon({ family: 'lucide', name: 'file-text' })

/** The card's one purposeful motion: a calm rise as the answer arrives.
 * Collapses to an instant appearance under system Reduce Motion. */
const settle = FadeInDown.duration(280).reduceMotion(ReduceMotion.System)

/** The `supported` result: a single deterministic form suggestion. "Start this
 * form" is the M1-T4 handoff into the application-creation flow. This card is
 * the assistant's centerpiece — serif title, roomy padding, hairline border. */
export function RecommendationCard({ content, onStart, isDisabled }: RecommendationCardProps) {
	return (
		<Animated.View entering={settle} className="max-w-[92%] self-start">
			<Card className="gap-hairline border border-border">
				<Card.Body className="gap-card p-gutter">
					<View className="flex-row items-center gap-control">
						<View className="h-11 w-11 items-center justify-center rounded-full bg-accent-soft">
							<FormIcon size={20} className="text-accent" />
						</View>
						<View className="flex-1 gap-hairline">
							<Text className="font-display text-xl leading-tight text-surface-foreground">
								{content.title}
							</Text>
							<Card.Description className="text-sm">{content.formLabel}</Card.Description>
						</View>
					</View>
					<Typography.Paragraph color="muted" className="text-sm leading-relaxed">
						{content.lead}
					</Typography.Paragraph>
				</Card.Body>
				<Card.Footer className="px-gutter pb-gutter">
					<Button variant="primary" isDisabled={isDisabled} onPress={() => onStart(content)}>
						<Button.Label>Start this form</Button.Label>
					</Button>
				</Card.Footer>
			</Card>
		</Animated.View>
	)
}
