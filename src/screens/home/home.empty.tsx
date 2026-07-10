import { TempAccountDeletionBanner } from '@/components/account'
import { BodyScrollView, FilingStackHero } from '@/components/core'
import { Typography } from 'heroui-native'
import { Text, View } from 'react-native'
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated'
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
	return (
		<BodyScrollView contentContainerClassName="grow pt-4">
			{/* M6-T4: a temp session in its final 24 hours is warned even here. */}
			<TempAccountDeletionBanner />

			<View className="grow items-center justify-center gap-6">
				<Animated.View entering={rise(0)}>
					<FilingStackHero width={148} />
				</Animated.View>
				<Animated.View entering={rise(1)} className="items-center gap-2">
					<Text className="text-center font-display text-title text-foreground">
						Nothing in motion yet.
					</Text>
					<Typography.Paragraph color="muted" className="max-w-[300px] text-center leading-relaxed">
						Start a work permit or green card renewal — your answers, documents, and deadlines
						collect here.
					</Typography.Paragraph>
				</Animated.View>
			</View>

			<Animated.View entering={rise(2)} className="gap-2 pt-8 pb-2">
				<StartApplicationButton />
				{/* The manual renewal path stays reachable with zero data (M6-T6):
				    adding a date populates the dashboard's Upcoming renewals. */}
				<AddRenewalEntry />
			</Animated.View>
		</BodyScrollView>
	)
}
