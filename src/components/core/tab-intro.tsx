import { StyledLucideIcon } from '@/components/styled-icon'
import { api } from '@convex/_generated/api'
import { useMutation, useQuery } from 'convex/react'
import { Button, Typography } from 'heroui-native'
import { useState, type ComponentProps, type ReactNode } from 'react'
import { Text, useWindowDimensions, View } from 'react-native'
import Animated, { FadeInDown, FadeOut, ReduceMotion } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

// Staggered rise for the intro content, the Welcome screen's entrance idiom.
const rise = (order: number) =>
	FadeInDown.duration(320)
		.delay(80 + order * 90)
		.reduceMotion(ReduceMotion.System)

// Calm exit: the intro fades away and the live tab is simply there beneath it.
const exit = FadeOut.duration(260).reduceMotion(ReduceMotion.System)

/** Height of the transparent large-title header above the tab content —
 * status bar excluded (that comes from the live safe-area inset). */
const LARGE_TITLE_HEADER_HEIGHT = 96

export type TabIntroFeature = {
	icon: ComponentProps<typeof StyledLucideIcon>['name']
	title: string
	detail: string
}

type TabIntroProps = {
	prefKey:
		| 'formsIntroDismissed'
		| 'casesIntroDismissed'
		| 'forumIntroDismissed'
		| 'accountIntroDismissed'
	hero: ReactNode
	title: string
	body: string
	features: TabIntroFeature[]
}

function FeatureRow({ icon, title, detail, compact }: TabIntroFeature & { compact: boolean }) {
	return (
		<View className="flex-row items-center gap-4">
			<View className="size-10 items-center justify-center rounded-2xl bg-surface-secondary">
				<StyledLucideIcon name={icon} size={18} className="text-muted" />
			</View>
			<View className="flex-1 gap-0.5">
				<Typography.Paragraph className="font-medium text-foreground">{title}</Typography.Paragraph>
				{/* Short screens (iPhone SE) drop the detail lines so the intro
				    stays a true one-screen page everywhere. */}
				{compact ? null : (
					<Typography.Paragraph color="muted" className="text-sm leading-snug">
						{detail}
					</Typography.Paragraph>
				)}
			</View>
		</View>
	)
}

/**
 * One-time tab intro (M7-T5): a full-surface overlay that teaches what the
 * tab offers, ending in a single "Got it". Dismissal is persisted per owner
 * (convex/preferences.ts) — it survives reinstalls, carries over when an
 * anonymous session converts, and is erased by the deletion cascade. The
 * overlay sits above the tab's live content and fades out into it; it is
 * sized to fit one screen (iPhone SE included) and never scrolls.
 */
export function TabIntro({ prefKey, hero, title, body, features }: TabIntroProps) {
	const insets = useSafeAreaInsets()
	const { height } = useWindowDimensions()
	// iPhone SE class — everything compresses so the page never scrolls.
	const compact = height < 750
	const dismissed = useQuery(api.preferences.getPreference, { key: prefKey })
	const setPreference = useMutation(api.preferences.setPreference)
	const [acknowledged, setAcknowledged] = useState(false)

	// undefined = still loading: render nothing rather than flashing the intro
	// at a returning owner. The overlay only ever appears for a real `false`.
	if (dismissed !== false || acknowledged) return null

	function dismiss() {
		setAcknowledged(true)
		void setPreference({ key: prefKey, value: true })
	}

	return (
		<Animated.View
			exiting={exit}
			className="absolute inset-0 bg-background px-6"
			style={{
				paddingTop: insets.top + LARGE_TITLE_HEADER_HEIGHT,
				paddingBottom: insets.bottom + 12,
			}}
		>
			<Animated.View
				entering={rise(0)}
				className="items-center"
				style={compact ? { transform: [{ scale: 0.8 }], marginVertical: -14 } : undefined}
			>
				{hero}
			</Animated.View>

			<Animated.View entering={rise(1)} className="items-center gap-2 pt-2">
				<Text
					className={`text-center font-display text-foreground ${compact ? 'text-2xl leading-8' : 'text-[28px] leading-9'}`}
				>
					{title}
				</Text>
				<Typography.Paragraph
					color="muted"
					className="max-w-[320px] text-center text-[15px] leading-snug"
				>
					{body}
				</Typography.Paragraph>
			</Animated.View>

			<Animated.View entering={rise(2)} className={compact ? 'gap-2.5 pt-4' : 'gap-3.5 pt-6'}>
				{features.map((feature) => (
					<FeatureRow key={feature.title} {...feature} compact={compact} />
				))}
			</Animated.View>

			<View className="grow" />

			<Animated.View entering={rise(3)}>
				<Button onPress={dismiss}>
					<Button.Label>Got it</Button.Label>
				</Button>
			</Animated.View>
		</Animated.View>
	)
}
