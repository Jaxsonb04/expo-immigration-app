import { TempAccountDeletionBanner } from '@/components/account'
import { FilingStackHero } from '@/components/core'
import { Typography } from 'heroui-native'
import { useState } from 'react'
import { Text, useWindowDimensions, View } from 'react-native'
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AddRenewalEntry } from './home.renewals'
import { StartApplicationButton } from './home.start-application-button'

const rise = (order: number) =>
	FadeInDown.duration(320)
		.delay(80 + order * 90)
		.reduceMotion(ReduceMotion.System)

/**
 * Post-intro empty state (M6-T6/T8): nothing in progress, nothing filed,
 * nothing to renew. The calm floating filing-cards graphic carries the screen;
 * the intro's feature pitch lives in home.intro.tsx and never repeats.
 */
export function EmptyDashboard() {
	const { height } = useWindowDimensions()
	// Device-aware sizing (M7 fix): the whole state — hero, copy, AND both
	// actions — must rest above the tab bar on every device, iPhone SE
	// included. Nothing may sit beneath the bar at rest.
	const compact = height < 750
	const insets = useSafeAreaInsets()
	// While the add-a-date form is open it needs the vertical room — the hero
	// and headline step aside so Add/Cancel stay above the tab bar.
	const [addingDate, setAddingDate] = useState(false)
	// A plain, non-scrolling layout with explicit header/tab-bar clearance:
	// flexGrow inside an inset-adjusted ScrollView sizes to the full frame and
	// silently pushed the actions below the tab bar. Fixed geometry keeps the
	// CTA above the bar on every device, deterministically.
	return (
		<View
			className="flex-1 px-5"
			style={{ paddingTop: insets.top + 96, paddingBottom: insets.bottom + 12 }}
		>
			{/* M6-T4: a temp session in its final 24 hours is warned even here. */}
			<TempAccountDeletionBanner />

			<View className={`grow items-center justify-center gap-4 ${addingDate ? 'opacity-0' : ''}`}>
				<Animated.View entering={rise(0)}>
					<FilingStackHero width={compact ? 100 : 126} />
				</Animated.View>
				<Animated.View entering={rise(1)} className="items-center gap-2">
					<Text
						className={`text-center font-display text-foreground ${compact ? 'text-2xl leading-8' : 'text-[28px] leading-9'}`}
					>
						Nothing in motion yet.
					</Text>
					<Typography.Paragraph
						color="muted"
						className="max-w-[300px] text-center text-[15px] leading-snug"
					>
						Start a work permit or green card renewal — your answers, documents, and deadlines
						collect here.
					</Typography.Paragraph>
				</Animated.View>
			</View>

			<Animated.View entering={rise(2)} className="gap-2 pt-5">
				<StartApplicationButton />
				{/* The manual renewal path stays reachable with zero data (M6-T6):
				    adding a date populates the dashboard's Upcoming renewals. */}
				<AddRenewalEntry onOpenChange={setAddingDate} />
			</Animated.View>
		</View>
	)
}
