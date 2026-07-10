import { BodyScrollView, FilingStackHero } from '@/components/core'
import { StyledLucideIcon } from '@/components/styled-icon'
import { api } from '@convex/_generated/api'
import { useMutation } from 'convex/react'
import { Button, Typography } from 'heroui-native'
import type { ComponentProps } from 'react'
import { Text, View } from 'react-native'
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated'
import { StartApplicationButton } from './home.start-application-button'

// A single staggered fade/rise, matching the Welcome screen's entrance idiom
// (transform + opacity only; collapses to an instant appearance under Reduce
// Motion).
const rise = (order: number) =>
	FadeInDown.duration(320)
		.delay(80 + order * 90)
		.reduceMotion(ReduceMotion.System)

type FeatureIcon = ComponentProps<typeof StyledLucideIcon>['name']

const FEATURES: { icon: FeatureIcon; title: string; detail: string }[] = [
	{
		icon: 'messages-square',
		title: 'Plain-language questions',
		detail: 'Answer in everyday words — we turn them into the right USCIS forms.',
	},
	{
		icon: 'calendar-clock',
		title: 'Never miss a deadline',
		detail: 'Reminders for every filing window, renewal, and expiring document.',
	},
	{
		icon: 'printer',
		title: 'Print-ready filing',
		detail: 'Export a clean, USCIS-ready packet the moment your answers are done.',
	},
]

function FeatureRow({ icon, title, detail }: (typeof FEATURES)[number]) {
	return (
		<View className="flex-row items-start gap-4">
			<View className="size-11 items-center justify-center rounded-2xl bg-surface-secondary">
				<StyledLucideIcon name={icon} size={20} className="text-muted" />
			</View>
			<View className="flex-1 gap-0.5 pt-0.5">
				<Typography.Paragraph className="font-medium text-foreground">{title}</Typography.Paragraph>
				<Typography.Paragraph color="muted" className="text-sm leading-snug">
					{detail}
				</Typography.Paragraph>
			</View>
		</View>
	)
}

/**
 * First-run intro (M6-T6): the floating filing-cards hero + the three feature
 * rows. Shown until acknowledged; "Got it" persists per owner
 * (convex/preferences.ts), so it never reappears — on this device or the next.
 */
export function IntroDashboard() {
	const setPreference = useMutation(api.preferences.setPreference)

	return (
		<BodyScrollView contentContainerClassName="grow pt-4">
			<Animated.View entering={rise(0)} className="items-center pt-6 pb-2">
				<FilingStackHero width={132} />
			</Animated.View>

			<Animated.View entering={rise(1)} className="items-center gap-3 pt-4">
				<Text className="text-center font-display text-title text-foreground">
					Let’s get your{'\n'}renewal moving.
				</Text>
				<Typography.Paragraph color="muted" className="max-w-[300px] text-center text-[17px] leading-relaxed">
					Immifile turns a stack of confusing forms into a few plain questions — and keeps every
					document and deadline in one place.
				</Typography.Paragraph>
			</Animated.View>

			<Animated.View entering={rise(2)} className="gap-5 pt-10">
				{FEATURES.map((feature) => (
					<FeatureRow key={feature.title} {...feature} />
				))}
			</Animated.View>

			<View className="grow" />

			<Animated.View entering={rise(3)} className="gap-3 pt-10">
				<StartApplicationButton />
				<Button
					variant="ghost"
					onPress={() => void setPreference({ key: 'formsIntroDismissed', value: true })}
				>
					<Button.Label>Got it</Button.Label>
				</Button>
				<View className="flex-row items-center justify-center gap-1.5">
					<StyledLucideIcon name="badge-check" size={14} className="text-muted" />
					<Typography.Paragraph color="muted" className="text-sm">
						Completely free
					</Typography.Paragraph>
				</View>
			</Animated.View>
		</BodyScrollView>
	)
}
