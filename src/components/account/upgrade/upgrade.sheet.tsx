import { BottomSheet } from 'heroui-native'
import { View } from 'react-native'
import type { InvestedProgress } from '../account.data'
import { InvestedProgressRecap } from './upgrade.invested-progress-recap'
import { UpgradeActions } from './upgrade.actions'

type UpgradeSheetProps = {
	/** Controlled open state. */
	isOpen: boolean
	/** Optional invested-progress recap shown above the actions. */
	recap?: InvestedProgress
	/** Fired once the anonymous session is upgraded to a permanent account. */
	onUpgraded: () => void
	/** Fired when the sheet is dismissed without upgrading (action parked). */
	onDismiss: () => void
}

/**
 * Contextual upgrade bottom sheet (ADR-0010 contextual gate). Presents the
 * invested-progress recap and the shared upgrade actions; converts an anonymous
 * user to a credentialed account in place and auto-resumes via `onUpgraded`.
 */
export function UpgradeSheet({ isOpen, recap, onUpgraded, onDismiss }: UpgradeSheetProps) {
	return (
		<BottomSheet
			isOpen={isOpen}
			onOpenChange={(open) => {
				if (!open) {
					onDismiss()
				}
			}}
		>
			<BottomSheet.Portal>
				<BottomSheet.Overlay />
				<BottomSheet.Content>
					<View className="gap-section px-section pb-8 pt-tight">
						<InvestedProgressRecap recap={recap} />
						<UpgradeActions onUpgraded={onUpgraded} />
					</View>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
	)
}
