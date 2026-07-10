import { StyledLucideIcon } from '@/components/styled-icon'
import { router } from 'expo-router'
import { Typography } from 'heroui-native'
import { useEffect } from 'react'
import { Pressable, useWindowDimensions } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
	cancelAnimation,
	Easing,
	runOnJS,
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
const EDGE_MARGIN = 20
// Rough bubble footprint used for clamping; measured on layout at runtime.
const FALLBACK_SIZE = { width: 92, height: 46 }
// Keep clear of the large-title header region at the top.
const TOP_CLEARANCE = 140

/** The bubble's last dragged offset, shared across surfaces (Forms and Cases
 * each mount their own bubble) and kept for the session — dragging it out of
 * the way on one tab keeps it out of the way everywhere. */
const rememberedOffset = { x: 0, y: 0 }

function rememberOffset(x: number, y: number) {
	rememberedOffset.x = x
	rememberedOffset.y = y
}

/**
 * The persistent "Ask" bubble (M7-T2, MASTER_PLAN Layout) — the assistant's
 * home now that it is no longer a tab. Anchored bottom-right above the tab
 * bar by default, and draggable (M7 fix): it snaps to the left or right edge
 * and stays where it's put for the session, so it never has to sit on top of
 * a control the user needs.
 *
 * Motion is a sibling of the idle-loop heroes: a one-time settle-in on mount
 * plus a slow breathe, transform/opacity only, and both collapse to a static
 * resting pose under Reduce Motion. Dragging is direct manipulation, so it
 * stays live under Reduce Motion too (only the snap easing is instant).
 */
export function AskBubble() {
	const insets = useSafeAreaInsets()
	const { width: screenWidth, height: screenHeight } = useWindowDimensions()
	const reduceMotion = useReducedMotion()

	const entrance = useSharedValue(reduceMotion ? 1 : 0)
	const breathe = useSharedValue(0)

	// Drag offsets are measured from the bottom-right anchor (negative x moves
	// left, negative y moves up). New mounts pick up the remembered spot.
	const offsetX = useSharedValue(rememberedOffset.x)
	const offsetY = useSharedValue(rememberedOffset.y)
	const startX = useSharedValue(0)
	const startY = useSharedValue(0)
	const bubbleWidth = useSharedValue(FALLBACK_SIZE.width)
	const bubbleHeight = useSharedValue(FALLBACK_SIZE.height)
	const isDragging = useSharedValue(false)

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

	const pan = Gesture.Pan()
		.minDistance(8)
		.onStart(() => {
			isDragging.value = true
			startX.value = offsetX.value
			startY.value = offsetY.value
		})
		.onUpdate((event) => {
			offsetX.value = startX.value + event.translationX
			offsetY.value = startY.value + event.translationY
		})
		.onEnd(() => {
			// Snap horizontally to the nearer edge; clamp vertically between the
			// header region and the resting spot above the tab bar.
			const leftOffset = -(screenWidth - bubbleWidth.value - EDGE_MARGIN * 2)
			const bubbleCenter = screenWidth - EDGE_MARGIN - bubbleWidth.value / 2 + offsetX.value
			const snappedX = bubbleCenter < screenWidth / 2 ? leftOffset : 0
			const minY = -(
				screenHeight -
				(insets.bottom + TAB_BAR_GAP) -
				bubbleHeight.value -
				(insets.top + TOP_CLEARANCE)
			)
			const clampedY = Math.min(0, Math.max(minY, offsetY.value))
			offsetX.value = withSpring(snappedX, { damping: 20, stiffness: 220 })
			offsetY.value = withSpring(clampedY, { damping: 20, stiffness: 220 })
			isDragging.value = false
			runOnJS(rememberOffset)(snappedX, clampedY)
		})

	const style = useAnimatedStyle(() => ({
		opacity: entrance.value,
		transform: [
			{ translateX: offsetX.value },
			{
				translateY:
					offsetY.value + 14 * (1 - entrance.value) - (isDragging.value ? 0 : 2 * breathe.value),
			},
			{ scale: (0.9 + 0.1 * entrance.value) * (isDragging.value ? 1.06 : 1) },
		],
	}))

	return (
		<GestureDetector gesture={pan}>
			<Animated.View
				style={[
					{ position: 'absolute', right: EDGE_MARGIN, bottom: insets.bottom + TAB_BAR_GAP },
					style,
				]}
				onLayout={(event) => {
					bubbleWidth.value = event.nativeEvent.layout.width
					bubbleHeight.value = event.nativeEvent.layout.height
				}}
			>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Ask the assistant"
					accessibilityHint="Opens a chat that helps you pick and understand your forms. Drag to move it out of the way."
					onPress={() => router.push('/assistant')}
					className="flex-row items-center gap-1.5 rounded-full bg-accent py-3 pl-3.5 pr-4 shadow-lg active:opacity-85"
				>
					<StyledLucideIcon name="sparkles" size={17} className="text-accent-foreground" />
					<Typography.Paragraph className="font-semibold text-accent-foreground">
						Ask
					</Typography.Paragraph>
				</Pressable>
			</Animated.View>
		</GestureDetector>
	)
}
