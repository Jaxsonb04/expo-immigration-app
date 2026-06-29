import { useCallback, useEffect, useMemo } from 'react'

import * as Haptics from 'expo-haptics'
import { Platform } from 'react-native'

/**
 * Named haptic presets used by {@link useHaptic}.
 *
 * **Impact** (`soft`–`rigid`): iOS uses `UIImpactFeedbackGenerator` styles; Android uses
 * semantic {@link https://developer.android.com/reference/android/view/HapticFeedbackConstants | AndroidHaptics}
 * via `performAndroidHapticsAsync` (recommended over vibrator-based `impactAsync` on Android).
 *
 * **Selection**: iOS `selectionAsync`; Android `Segment_Tick`.
 *
 * **Notifications**: iOS `UINotificationFeedbackGenerator`; Android `Confirm` / `Keyboard_Tap` / `Reject`
 * for success / warning / error (Android has no dedicated “warning” constant; `Keyboard_Tap` is the neutral middle).
 */
type FeedbackType =
	| 'soft'
	| 'light'
	| 'medium'
	| 'heavy'
	| 'rigid'
	| 'selection'
	| 'success'
	| 'warning'
	| 'error'

/**
 * Returns a stable callback that triggers one-shot haptic feedback for the chosen preset.
 *
 * Call the returned function in response to user actions (press, toggle, completion, etc.).
 * On **web**, feedback is skipped (and unknown presets log a warning). On **iOS**, uses
 * `expo-haptics` impact, selection, or notification APIs. On **Android**, uses
 * `performAndroidHapticsAsync` with semantic `AndroidHaptics` values mapped from each preset.
 *
 * @param feedbackType - Which feedback character to play; defaults to `'selection'`.
 * @returns A no-arg function that performs the haptic once when invoked.
 */
export const useHaptic = (feedbackType: FeedbackType = 'selection'): (() => void) => {
	const createImpactHandler = useCallback(
		(ios: Haptics.ImpactFeedbackStyle, android: Haptics.AndroidHaptics) => {
			if (Platform.OS === 'web') return undefined
			if (Platform.OS === 'android') {
				return () => Haptics.performAndroidHapticsAsync(android)
			}
			return () => Haptics.impactAsync(ios)
		},
		[],
	)

	const createNotificationHandler = useCallback(
		(ios: Haptics.NotificationFeedbackType, android: Haptics.AndroidHaptics) => {
			if (Platform.OS === 'web') return undefined
			if (Platform.OS === 'android') {
				return () => Haptics.performAndroidHapticsAsync(android)
			}
			return () => Haptics.notificationAsync(ios)
		},
		[],
	)

	const createSelectionHandler = useCallback(() => {
		if (Platform.OS === 'web') return undefined
		if (Platform.OS === 'android') {
			return () => Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Segment_Tick)
		}
		return Haptics.selectionAsync
	}, [])

	const hapticHandlers = useMemo(
		() => ({
			soft: createImpactHandler(
				Haptics.ImpactFeedbackStyle.Soft,
				Haptics.AndroidHaptics.Segment_Frequent_Tick,
			),
			light: createImpactHandler(
				Haptics.ImpactFeedbackStyle.Light,
				Haptics.AndroidHaptics.Virtual_Key,
			),
			medium: createImpactHandler(
				Haptics.ImpactFeedbackStyle.Medium,
				Haptics.AndroidHaptics.Context_Click,
			),
			heavy: createImpactHandler(
				Haptics.ImpactFeedbackStyle.Heavy,
				Haptics.AndroidHaptics.Keyboard_Press,
			),
			rigid: createImpactHandler(
				Haptics.ImpactFeedbackStyle.Rigid,
				Haptics.AndroidHaptics.Clock_Tick,
			),
			selection: createSelectionHandler(),
			success: createNotificationHandler(
				Haptics.NotificationFeedbackType.Success,
				Haptics.AndroidHaptics.Confirm,
			),
			warning: createNotificationHandler(
				Haptics.NotificationFeedbackType.Warning,
				Haptics.AndroidHaptics.Keyboard_Tap,
			),
			error: createNotificationHandler(
				Haptics.NotificationFeedbackType.Error,
				Haptics.AndroidHaptics.Reject,
			),
		}),
		[createImpactHandler, createNotificationHandler, createSelectionHandler],
	)

	return (
		hapticHandlers[feedbackType] ??
		(() => {
			console.warn('Haptic feedback type not supported on this platform')
		})
	)
}

/**
 * Plays the **success** haptic once after a short delay, typically after mount when a screen
 * or flow completes successfully (e.g. payment confirmed).
 *
 * Uses the same platform mapping as {@link useHaptic}(`'success'`): iOS success notification,
 * Android `Confirm` (`AndroidHaptics`).
 *
 * @param options.delay - Milliseconds to wait before triggering (default `200`).
 */
export const useSuccessHaptic = ({ delay = 200 }: { delay?: number } = {}) => {
	const haptic = useHaptic('success')

	useEffect(() => {
		const timeoutId = setTimeout(() => {
			haptic()
		}, delay)

		return () => {
			clearTimeout(timeoutId)
		}
	}, [haptic, delay])
}
