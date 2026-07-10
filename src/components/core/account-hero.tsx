import { StyledLucideIcon } from '@/components/styled-icon'
import { useEffect } from 'react'
import { View } from 'react-native'
import Animated, {
	cancelAnimation,
	Easing,
	useAnimatedStyle,
	useReducedMotion,
	useSharedValue,
	withRepeat,
	withTiming,
} from 'react-native-reanimated'

/** Ping-pong a shared value 0→1 forever on its own slow period. */
function useIdleLoop(duration: number, enabled: boolean) {
	const value = useSharedValue(0)
	useEffect(() => {
		if (!enabled) return
		value.value = withRepeat(
			withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }),
			-1,
			true,
		)
		return () => cancelAnimation(value)
	}, [duration, enabled, value])
	return value
}

type AccountHeroProps = {
	/** Diameter of the identity circle in px; satellites scale with it. */
	size?: number
}

/**
 * Identity hero for the Account intro (M7-T5): a soft identity circle with
 * two small satellites — personal details and documents — drifting beside
 * it. A sibling of the filing-stack/case-tracking/community heroes: same
 * idle-loop idiom on different periods, transform/opacity only, theme tokens
 * only, and a static resting pose under Reduce Motion.
 */
export function AccountHero({ size = 120 }: AccountHeroProps) {
	const reduceMotion = useReducedMotion()
	const animated = !reduceMotion

	const float = useIdleLoop(3000, animated)
	const orbit = useIdleLoop(4600, animated)

	const circleStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: -5 * float.value }],
	}))
	const leftChipStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: 6 - 8 * orbit.value }, { rotate: `${-6 + 3 * orbit.value}deg` }],
	}))
	const rightChipStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: -4 + 8 * orbit.value }, { rotate: `${5 - 3 * orbit.value}deg` }],
	}))

	const chip = size * 0.38
	return (
		<View
			style={{ width: size * 1.9, height: size * 1.24 }}
			className="items-center justify-center"
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
		>
			<Animated.View
				style={[{ width: size, height: size, borderRadius: size / 2 }, circleStyle]}
				className="items-center justify-center border border-separator bg-surface"
			>
				<View
					style={{ width: size * 0.34, height: size * 0.34, borderRadius: size * 0.17 }}
					className="items-center justify-center bg-surface-secondary"
				>
					<StyledLucideIcon name="user-round" size={size * 0.2} className="text-accent" />
				</View>
			</Animated.View>

			<Animated.View
				style={[
					{ width: chip, height: chip, borderRadius: chip * 0.32, position: 'absolute', left: 0, top: size * 0.16 },
					leftChipStyle,
				]}
				className="items-center justify-center border border-separator bg-surface-secondary"
			>
				<StyledLucideIcon name="file-text" size={chip * 0.5} className="text-muted" />
			</Animated.View>

			<Animated.View
				style={[
					{ width: chip, height: chip, borderRadius: chip * 0.32, position: 'absolute', right: 0, bottom: size * 0.1 },
					rightChipStyle,
				]}
				className="items-center justify-center border border-separator bg-surface-secondary"
			>
				<StyledLucideIcon name="shield-check" size={chip * 0.5} className="text-muted" />
			</Animated.View>
		</View>
	)
}
