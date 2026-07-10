import { router } from 'expo-router'
import { Button, Typography } from 'heroui-native'
import { Pressable, Text, useWindowDimensions, View } from 'react-native'
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { UscisNews } from './community.news'

const rise = (order: number) =>
	FadeInDown.duration(320)
		.delay(80 + order * 90)
		.reduceMotion(ReduceMotion.System)

/**
 * Empty Forum (M7 fix): a calm one-screen surface — official USCIS news at the
 * top carries the visual weight, then generous whitespace, a quiet prompt, and
 * the primary "Start a post" CTA pinned above the tab bar.
 *
 * Two earlier problems fixed here:
 *  1. The old layout stacked the news card and a full-height centered
 *     `ScreenEmpty` inside a ScrollView, so the empty shell claimed its own
 *     viewport-worth of height and pushed the CTA a screen down, under the nav
 *     bar. This uses fixed geometry (like `home.empty.tsx`) with explicit
 *     header/tab-bar clearance so nothing is ever cut off or needs scrolling.
 *  2. The first pass then fit everything in — news card, a large animated
 *     chat-bubble hero, a display headline, and a four-line blurb — but read
 *     as crowded. The illustration competed with the news card, so it's gone;
 *     whitespace and a single-line prompt do the work instead.
 */
export function CommunityEmpty() {
	const { height } = useWindowDimensions()
	// iPhone SE class — the news card drops to two items so the prompt and CTA
	// still rest comfortably above the tab bar.
	const compact = height < 750
	const insets = useSafeAreaInsets()

	return (
		<View
			className="flex-1 px-5"
			style={{ paddingTop: insets.top + 96, paddingBottom: insets.bottom + 12 }}
		>
			<Animated.View entering={rise(0)}>
				<UscisNews maxItems={compact ? 2 : 3} />
			</Animated.View>

			{/* No illustration — the news card is the screen's visual anchor, and
			    the empty prompt stays quiet so the surface never feels crowded. */}
			<Animated.View entering={rise(1)} className="grow items-center justify-center gap-2">
				<Text className="text-center font-display text-2xl leading-8 text-foreground">
					No posts yet
				</Text>
				<Typography.Paragraph
					color="muted"
					className="max-w-[280px] text-center text-[15px] leading-snug"
				>
					Be the first to ask a question or share your renewal experience.
				</Typography.Paragraph>
			</Animated.View>

			<Animated.View entering={rise(2)} className="gap-3 pt-4">
				<Button onPress={() => router.push('/new-post')}>
					<Button.Label>Start a post</Button.Label>
				</Button>
				<Pressable
					accessibilityRole="link"
					accessibilityLabel="Read the forum rules"
					onPress={() => router.push('/community-rules')}
					className="self-center"
				>
					<Typography.Paragraph color="muted" className="text-center text-xs font-medium underline">
						Forum rules
					</Typography.Paragraph>
				</Pressable>
			</Animated.View>
		</View>
	)
}
