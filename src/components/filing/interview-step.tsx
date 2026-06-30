import { Stack } from 'expo-router'
import { Avatar, Button, Popover, Separator, Typography } from 'heroui-native'
import { useState, type ReactNode } from 'react'
import { View } from 'react-native'
import { KeyboardAwareScrollView, KeyboardStickyView } from 'react-native-keyboard-controller'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export type InterviewStepProps = {
	/** The big, plain-language question for this step (the tax-software pattern). */
	heading: string
	/**
	 * Contextual help shown from the "?" trigger (ADR-0012 — help is available on
	 * every step). A string renders as a popover description; a node renders as-is.
	 * When omitted, the "?" trigger is hidden.
	 */
	help?: ReactNode
	/** Optional title above the help text in the popover. */
	helpTitle?: string
	/**
	 * Optional avatar/mascot slot. Falls back to a neutral placeholder so every
	 * Interview step reads consistently until a real mascot is wired in.
	 */
	avatar?: ReactNode
	/** Go to the previous step. When omitted, the Back control is hidden. */
	onBack?: () => void
	/**
	 * Attempt to advance. Wire this to the step's group/form submit so validation
	 * runs first (validate-then-advance, ADR-0013).
	 */
	onNext: () => void
	/** Gate the primary action; `false` disables it. Defaults to enabled. */
	canAdvance?: boolean
	/** Primary action label (e.g. "Continue", "Save applicant"). */
	nextLabel?: string
	/** Back action label. */
	backLabel?: string
	/** Shows a busy state on the primary action and disables it. */
	isNextPending?: boolean
	/** The step body — typically the bound `form.AppField`s for this section. */
	children: ReactNode
}

/**
 * Reusable presentational shell for one Interview step (ADR-0012). It owns no
 * form state: a big heading, an optional "?" help popover, an avatar slot, the
 * step body, and a sticky Back/Next footer that sits above the keyboard. Filing
 * wizards (I-90, I-765, …) compose their `withForm` step components around this.
 */
export function InterviewStep({
	heading,
	help,
	helpTitle,
	avatar,
	onBack,
	onNext,
	canAdvance = true,
	nextLabel = 'Continue',
	backLabel = 'Back',
	isNextPending = false,
	children,
}: InterviewStepProps) {
	const insets = useSafeAreaInsets()

	return (
		<>
			<KeyboardAwareScrollView
				className="flex-1"
				keyboardDismissMode="on-drag"
				keyboardShouldPersistTaps="handled"
				contentInsetAdjustmentBehavior="automatic"
				contentContainerClassName="pb-safe-8 px-5"
			>
				<View className="min-h-9 flex-row items-center justify-between">
					{help != null ? <HelpTrigger title={helpTitle} content={help} /> : <View />}
				</View>

				<View className="gap-4">
					{avatar ?? (
						<Avatar size="lg" color="accent">
							<Avatar.Fallback />
						</Avatar>
					)}
					<Typography.Heading className="text-3xl font-bold">{heading}</Typography.Heading>
				</View>

				<View className="gap-4">{children}</View>
			</KeyboardAwareScrollView>

			<KeyboardStickyView className="bg-background" offset={{ opened: insets.bottom }}>
				<Separator />
				<View className="px-5 pt-3" style={{ paddingBottom: insets.bottom + 12 }}>
					<Button isDisabled={!canAdvance || isNextPending} onPress={onNext}>
						<Button.Label>{nextLabel}</Button.Label>
					</Button>
				</View>
			</KeyboardStickyView>
		</>
	)
}

/** The "?" help affordance: a round trigger that opens a popover with the copy. */
function HelpTrigger({ title, content }: { title?: string; content: ReactNode }) {
	const [isOpen, setIsOpen] = useState(false)
	return (
		<Popover isOpen={isOpen} onOpenChange={setIsOpen} presentation="bottom-sheet">
			<Stack.Toolbar placement="right">
				<Stack.Toolbar.Button icon="questionmark.circle" onPress={() => setIsOpen(true)} />
			</Stack.Toolbar>
			<Popover.Portal>
				<Popover.Overlay className="bg-black/15" />
				<Popover.Content presentation="bottom-sheet">
					<Popover.Arrow />
					{title ? <Popover.Title>{title}</Popover.Title> : null}
					{typeof content === 'string' ? (
						<Popover.Description>{content}</Popover.Description>
					) : (
						content
					)}
				</Popover.Content>
			</Popover.Portal>
		</Popover>
	)
}
