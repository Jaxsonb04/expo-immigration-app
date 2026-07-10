import { StyledLucideIcon } from '@/components/styled-icon'
import { router } from 'expo-router'
import { Typography } from 'heroui-native'
import { useEffect } from 'react'
import { Pressable } from 'react-native'
import Animated, {
	cancelAnimation,
	Easing,
	useAnimatedStyle,
	useReducedMotion,
	useSharedValue,
	withDelay,
	withRepeat,
	withSpring,
	withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

// Breathing room between the bubble and the native tab bar (M7-T2). The
// native tabs already contribute the tab bar to the safe-area bottom inset
// (measured: insets.bottom ≈ 82pt on iPhone 17), so only a small gap is added.
const TAB_BAR_GAP = 12

/**
 * The persistent "Ask" bubble (M7-T2, MASTER_PLAN Layout) — the assistant's
 * home now that it is no longer a tab. Anchored bottom-right above the tab
 * bar on the Forms and Cases surfaces, where form-choice and case-status
 * questions actually come up; tapping it opens the assistant sheet.
 *
 * Motion is a sibling of the idle-loop heroes: a one-time settle-in on mount
 * plus a slow breathe, transform/opacity only, and both collapse to a static
 * resting pose under Reduce Motion.
 */
export function AskBubble() {
	const insets = useSafeAreaInsets()
	const reduceMotion = useReducedMotion()

	const entrance = useSharedValue(reduceMotion ? 1 : 0)
	const breathe = useSharedValue(0)

	useEffect(() => {
		if (reduceMotion) return
		entrance.value = withDelay(350, withSpring(1, { damping: 16, stiffness: 160 }))
		breathe.value = withRepeat(
			withTiming(1, { duration: 3400, easing: Easing.inOut(Easing.ease) }),
			-1,
			true,
		)
		return () => {
			cancelAnimation(entrance)
			cancelAnimation(breathe)
		}
	}, [reduceMotion, entrance, breathe])

	const style = useAnimatedStyle(() => ({
		opacity: entrance.value,
		transform: [
			{ translateY: 14 * (1 - entrance.value) - 2 * breathe.value },
			{ scale: 0.9 + 0.1 * entrance.value },
		],
	}))

	return (
		<Animated.View
			style={[{ position: 'absolute', right: 20, bottom: insets.bottom + TAB_BAR_GAP }, style]}
		>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel="Ask the assistant"
				accessibilityHint="Opens a chat that helps you pick and understand your forms"
				onPress={() => router.push('/assistant')}
				className="flex-row items-center gap-1.5 rounded-full bg-accent py-3 pl-3.5 pr-4 shadow-lg active:opacity-85"
			>
				<StyledLucideIcon name="sparkles" size={17} className="text-accent-foreground" />
				<Typography.Paragraph className="font-semibold text-accent-foreground">
					Ask
				</Typography.Paragraph>
			</Pressable>
		</Animated.View>
	)
}
