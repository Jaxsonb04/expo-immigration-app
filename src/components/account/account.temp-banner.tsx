import { api } from '@convex/_generated/api'
import { TEMP_ACCOUNT_WARNING_MS } from '@convex/shared/tempAccounts'
import { useQuery } from 'convex/react'
import { Button, Surface, Typography } from 'heroui-native'
import { useSyncExternalStore } from 'react'
import { View } from 'react-native'

import { StyledLucideIcon } from '@/components/styled-icon'

import { useRequireAccount } from './account.require-account'
import { useAccountSession } from './account.session'

/** Calm phrasing of time left before the 48-hour deletion (M6-T4). */
export function deletionTimeLeftCopy(deleteAt: number, now: number): string {
	const remaining = deleteAt - now
	if (remaining <= 60 * 60 * 1000) return 'within the hour'
	const hours = Math.round(remaining / (60 * 60 * 1000))
	if (hours < 36) return `in about ${hours} hours`
	return `in about ${Math.round(hours / 24)} days`
}

function useTempAccountDeadline(): number | null {
	const { isAnonymous } = useAccountSession()
	const status = useQuery(api.tempAccounts.tempAccountStatus, isAnonymous ? {} : 'skip')
	return status?.deleteAt ?? null
}

// Wall clock as an external store, quantized to the minute so the snapshot is
// referentially stable between ticks (render-purity-safe way to read time).
const MINUTE = 60_000
const subscribeMinuteTick = (onTick: () => void): (() => void) => {
	const id = setInterval(onTick, MINUTE)
	return () => clearInterval(id)
}
const currentMinute = () => Math.floor(Date.now() / MINUTE) * MINUTE

function useNow(): number {
	return useSyncExternalStore(subscribeMinuteTick, currentMinute, currentMinute)
}

/**
 * Deletion warning for temporary sessions (M6-T4): appears once the account is
 * inside the final 24 hours of its 48-hour window, so a filer mid-task is
 * never surprised. Rendered at the top of the Forms dashboard.
 */
export function TempAccountDeletionBanner() {
	const requireAccount = useRequireAccount()
	const deleteAt = useTempAccountDeadline()
	const now = useNow()
	if (deleteAt === null || deleteAt - now > TEMP_ACCOUNT_WARNING_MS) return null

	return (
		<Surface className="gap-control rounded-2xl border border-warning/40 bg-warning/10 p-card">
			<View className="flex-row items-start gap-control">
				<StyledLucideIcon name="clock-alert" size={18} className="mt-hairline text-warning" />
				<View className="flex-1 gap-hairline">
					<Typography.Paragraph className="font-medium">
						Your temporary account will be deleted {deletionTimeLeftCopy(deleteAt, now)}
					</Typography.Paragraph>
					<Typography.Paragraph color="muted" className="text-sm leading-snug">
						Everything you’ve entered goes with it. Create an account or continue with Google to
						keep your work — it carries over automatically.
					</Typography.Paragraph>
				</View>
			</View>
			<Button
				size="sm"
				variant="secondary"
				onPress={() =>
					void requireAccount({
						title: 'Keep your work',
						description:
							'Create an account or continue with Google — everything you’ve entered carries over.',
					})
				}
			>
				<Button.Label>Keep my work</Button.Label>
			</Button>
		</Surface>
	)
}

/**
 * Always-visible conversion card for temporary sessions on the Profile screen
 * (M6-T2/T3): states the 48-hour lifetime plainly and offers the upgrade.
 */
export function TempAccountCard() {
	const requireAccount = useRequireAccount()
	const deleteAt = useTempAccountDeadline()
	const now = useNow()
	if (deleteAt === null) return null

	return (
		<Surface variant="secondary" className="gap-control rounded-2xl p-card">
			<View className="gap-hairline">
				<Typography.Paragraph className="font-medium">
					You’re using a temporary account
				</Typography.Paragraph>
				<Typography.Paragraph color="muted" className="text-sm leading-snug">
					It and everything in it will be deleted {deletionTimeLeftCopy(deleteAt, now)}. Link
					Google or create an account to save your work permanently.
				</Typography.Paragraph>
			</View>
			<Button
				size="sm"
				onPress={() =>
					void requireAccount({
						title: 'Keep your work',
						description:
							'Create an account or continue with Google — everything you’ve entered carries over.',
					})
				}
			>
				<Button.Label>Create account</Button.Label>
			</Button>
		</Surface>
	)
}
