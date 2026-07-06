import { ScreenEmpty } from '@/components/core'

/**
 * Assistant tab shell. The chat assistant (M1), renewal reminders (M5-T1), and
 * official USCIS news (M5-T2) land here; until then this shows an empty state so
 * the tab reads as intentional rather than broken.
 */
export function AssistantScreen() {
	return (
		<ScreenEmpty
			title="Your assistant is on the way"
			description="Soon you’ll get plain-language help choosing the right form, gentle renewal reminders, and the latest official USCIS news — all in one place."
		/>
	)
}
