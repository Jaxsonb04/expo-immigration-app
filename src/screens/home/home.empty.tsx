import { TempAccountDeletionBanner } from '@/components/account'
import { FilingStackHero } from '@/components/core'
import { Typography } from 'heroui-native'
import { useState } from 'react'
import { ScrollView, Text, useWindowDimensions, View } from 'react-native'
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
	const { height, fontScale } = useWindowDimensions()
	// Device-aware sizing (M7 fix): keep the decorative hero compact on iPhone
	// SE-class screens; the persistent warning makes the complete state
	// scrollable, with both actions stopping above the tab bar.
	const compact = height < 750
	const showsScrollIndicator = compact || fontScale > 1.2
	const insets = useSafeAreaInsets()
	// While the add-a-date form is open it needs the vertical room — the hero
	// and headline step aside so Add/Cancel stay above the tab bar.
	const [addingDate, setAddingDate] = useState(false)
	// The always-visible temporary-account notice makes this surface taller than
	// an iPhone SE even at standard text sizes. Keep explicit header/tab-bar
	// clearance and a real scroll path so both application actions remain
	// reachable; large Dynamic Type also gets a visible scroll indicator.
	return (
		<ScrollView
			className="flex-1"
			contentContainerClassName="grow px-gutter"
			contentContainerStyle={{
				paddingBottom: insets.bottom + 12,
			}}
			automaticallyAdjustsScrollIndicatorInsets
			contentInsetAdjustmentBehavior="automatic"
			scrollEnabled
			bounces
			showsVerticalScrollIndicator={showsScrollIndicator}
		>
			{/* P0-4: warn from the first empty dashboard, not only near deletion. */}
			<TempAccountDeletionBanner />

			<View
				className={`grow items-center justify-center gap-card ${addingDate ? 'opacity-0' : ''}`}
			>
				<Animated.View entering={rise(0)}>
					<FilingStackHero width={compact ? 100 : 126} />
				</Animated.View>
				<Animated.View entering={rise(1)} className="items-center gap-tight">
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

			<Animated.View entering={rise(2)} className="gap-tight pt-gutter">
				<StartApplicationButton />
				{/* The manual renewal path stays reachable with zero data (M6-T6):
				    adding a date populates the dashboard's Upcoming renewals. */}
				<AddRenewalEntry onOpenChange={setAddingDate} />
			</Animated.View>
		</ScrollView>
	)
}
