import { ScreenEmpty } from '@/components/core'

/**
 * Cases tab shell. Receipt-number tracking and status timelines are built in M3;
 * until then this shows an empty state explaining what the tab will hold.
 */
export function CasesScreen() {
	return (
		<ScreenEmpty
			title="No cases to track yet"
			description="Once you’ve filed with USCIS, add your receipt number here to follow each case’s status and timeline."
		/>
	)
}
