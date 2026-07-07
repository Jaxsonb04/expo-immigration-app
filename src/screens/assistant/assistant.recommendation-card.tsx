import { Button, Card, Typography } from 'heroui-native'
import { View } from 'react-native'

import { styledIcon } from '@/components/styled-icon'

import type { AssistantContent } from './assistant.types'

type RecommendationContent = Extract<AssistantContent, { kind: 'recommendation' }>

type RecommendationCardProps = {
	content: RecommendationContent
	onStart: (content: RecommendationContent) => void
	isDisabled?: boolean
}

const FormIcon = styledIcon({ family: 'lucide', name: 'file-text' })

/** The `supported` result: a single deterministic form suggestion. "Start this
 * form" is the M1-T4 handoff into the application-creation flow. */
export function RecommendationCard({ content, onStart, isDisabled }: RecommendationCardProps) {
	return (
		<Card className="max-w-[92%] self-start gap-1">
			<Card.Body className="gap-3">
				<View className="flex-row items-center gap-3">
					<View className="h-10 w-10 items-center justify-center rounded-full bg-accent/15">
						<FormIcon size={20} className="text-accent" />
					</View>
					<View className="flex-1">
						<Card.Title className="text-base font-semibold">{content.title}</Card.Title>
						<Card.Description className="text-sm">{content.formLabel}</Card.Description>
					</View>
				</View>
				<Typography.Paragraph color="muted" className="text-sm leading-relaxed">
					{content.lead}
				</Typography.Paragraph>
			</Card.Body>
			<Card.Footer>
				<Button variant="primary" isDisabled={isDisabled} onPress={() => onStart(content)}>
					<Button.Label>Start this form</Button.Label>
				</Button>
			</Card.Footer>
		</Card>
	)
}
