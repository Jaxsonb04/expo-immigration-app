import { Button, InputGroup, Spinner, useThemeColor } from 'heroui-native'
import { useState } from 'react'

import { styledIcon } from '@/components/styled-icon'

const SendIcon = styledIcon({ family: 'lucide', name: 'arrow-up' })

type ComposerProps = {
	/** Returns true when the message was accepted (enqueued); the field is only
	 * cleared then, so a rejected send never discards the user's text. */
	onSend: (message: string) => boolean
	isSending: boolean
	/** False when a request is in flight or the daily quota is spent. */
	canSend: boolean
	outOfMessages: boolean
}

/** The message input row: a growing multiline field with an inline send button
 * that turns into a spinner while a request is in flight. */
export function Composer({ onSend, isSending, canSend, outOfMessages }: ComposerProps) {
	const [value, setValue] = useState('')
	const accentForeground = useThemeColor('accent-foreground')
	const trimmed = value.trim()
	const canSubmit = canSend && trimmed.length > 0

	function submit() {
		if (!canSubmit) return
		if (onSend(trimmed)) setValue('')
	}

	return (
		<InputGroup isDisabled={outOfMessages}>
			<InputGroup.Input
				value={value}
				onChangeText={setValue}
				placeholder={outOfMessages ? 'Daily message limit reached' : 'Describe your situation…'}
				multiline
				editable={!outOfMessages}
				className="max-h-32 min-h-11 py-2.5"
				submitBehavior="blurAndSubmit"
			/>
			<InputGroup.Suffix>
				<Button
					isIconOnly
					size="sm"
					variant="primary"
					isDisabled={!canSubmit}
					onPress={submit}
					accessibilityLabel="Send message"
				>
					{isSending ? (
						<Spinner size="sm" color={accentForeground} />
					) : (
						<SendIcon size={17} className="text-accent-foreground" />
					)}
				</Button>
			</InputGroup.Suffix>
		</InputGroup>
	)
}
