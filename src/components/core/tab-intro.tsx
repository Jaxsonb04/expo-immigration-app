import { StyledLucideIcon } from '@/components/styled-icon'
import { api } from '@convex/_generated/api'
import { useMutation, useQuery } from 'convex/react'
import { Button, Typography } from 'heroui-native'
import { useEffect, useState, type ComponentProps, type ReactNode } from 'react'
import { Text, useWindowDimensions, View } from 'react-native'
import Animated, {
	Easing,
	FadeInDown,
	ReduceMotion,
	useAnimatedStyle,
	withTiming,
} from 'react-native-reanimated'
import { initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context'

// Staggered rise for the intro content, the Welcome screen's entrance idiom.
const rise = (order: number) =>
	FadeInDown.duration(320)
		.delay(80 + order * 90)
		.reduceMotion(ReduceMotion.System)

// Calm dismissal: the overlay eases its own opacity to 0 (with a slight scale)
// to reveal the live tab beneath — an unhurried, animated exit, not a blink.
const DISMISS_DURATION_MS = 340
const DISMISS_EASING = Easing.out(Easing.cubic)

type PrefKey =
	| 'formsIntroDismissed'
	| 'casesIntroDismissed'
	| 'forumIntroDismissed'
	| 'accountIntroDismissed'

/** Height of the transparent large-title header the intro sits below. */
const LARGE_TITLE_HEADER_HEIGHT = 96
/** Clearance for the floating iOS tab bar so the "Got it" button clears it — the
 * bar stays visible during the intro (hiding/covering it lagged the native tab
 * switch by a frame and glimpsed the tab first). */
const TAB_BAR_CLEARANCE = 108

export type TabIntroFeature = {
	icon: ComponentProps<typeof StyledLucideIcon>['name']
	title: string
	detail: string
}

type TabIntroProps = {
	prefKey: PrefKey
	hero: ReactNode
	title: string
	body: string
	features: TabIntroFeature[]
	/** The tab's real content. Kept unmounted while a first-run intro covers the
	 * surface (see `showContent`) so nothing can peek out from under it. */
	children: ReactNode
}

// Title-only rows: with the tab bar visible during the intro, the page has less
// height, so the one-liner detail under each feature is dropped everywhere —
// the icon + title reads cleaner and keeps the page uncrowded and scroll-free.
function FeatureRow({ icon, title }: TabIntroFeature) {
	return (
		<View className="flex-row items-center gap-4">
			<View className="size-10 items-center justify-center rounded-2xl bg-surface-secondary">
				<StyledLucideIcon name={icon} size={18} className="text-muted" />
			</View>
			<Typography.Paragraph className="flex-1 font-medium text-foreground">
				{title}
			</Typography.Paragraph>
		</View>
	)
}

/**
 * One-time tab intro (M7-T5): a full-surface intro that teaches what the tab
 * offers, ending in a single "Got it". Dismissal is persisted per owner
 * (convex/preferences.ts) — it survives reinstalls, carries over when an
 * anonymous session converts, and is erased by the deletion cascade.
 *
 * Presentation: while an intro is showing it IS the tab's content — a plain flex
 * child rendered from the tab's first frame, with no separate overlay window and
 * no absolute positioning. Every tab pre-renders, so this is on screen the
 * instant the tab is shown; nothing of the real tab can flash before it. (The
 * two rejected alternatives — hiding the tab bar, or covering it with a
 * `FullWindowOverlay` — both lag the native tab switch by a frame, so the tab
 * chrome glimpsed through first; hiding it also replayed the iOS 26 Liquid Glass
 * selection animation on dismiss. The trade-off here is that the tab bar stays
 * visible during the intro.) The tab's real content is kept unmounted until the
 * intro is gone; during the dismiss fade the intro becomes an absolute cover so
 * the fade reveals the content mounting beneath it.
 */
export function TabIntro({ prefKey, hero, title, body, features, children }: TabIntroProps) {
	const liveInsets = useSafeAreaInsets()
	// The per-tab SafeAreaProvider NativeTabs wraps every screen in reports
	// UNSTABLE insets on a tab's first paint (0/0, then device, then tab-bar-
	// inclusive), which made the intro's padding jump on entry (Expo #42486 /
	// react-native-screens #3573). The launch-time device insets are stable.
	const insets = initialWindowMetrics?.insets ?? liveInsets
	const { height } = useWindowDimensions()
	// iPhone SE class — everything compresses so the page never scrolls.
	const compact = height < 750
	const dismissed = useQuery(api.preferences.getPreference, { key: prefKey })
	const setPreference = useMutation(api.preferences.setPreference)
	const [acknowledged, setAcknowledged] = useState(false)
	const [dismissing, setDismissing] = useState(false)

	// The intro covers the surface for a not-yet-dismissed owner and stays put
	// through its own fade (`|| dismissing`) so a fast preference round-trip can't
	// pop it out mid-fade — until the fade completes and sets `acknowledged`.
	const showIntro = (dismissed === false || dismissing) && !acknowledged
	// Mount the real content only once we're past the fresh intro.
	const showContent = dismissed === true || dismissing || acknowledged

	// Only the dismiss transition animates; while shown the intro is fully opaque
	// and static. Declarative tween, not an imperative shared-value write (the
	// React Compiler rejects `opacity.value =`).
	const overlayStyle = useAnimatedStyle(() => {
		if (!dismissing) return { opacity: 1, transform: [{ scale: 1 }] }
		const out = {
			duration: DISMISS_DURATION_MS,
			easing: DISMISS_EASING,
			reduceMotion: ReduceMotion.System,
		}
		return { opacity: withTiming(0, out), transform: [{ scale: withTiming(1.03, out) }] }
	})

	// Unmount the intro only once the fade has fully played.
	useEffect(() => {
		if (!dismissing) return
		const timer = setTimeout(() => setAcknowledged(true), DISMISS_DURATION_MS)
		return () => clearTimeout(timer)
	}, [dismissing])

	function dismiss() {
		if (dismissing) return
		void setPreference({ key: prefKey, value: true })
		setDismissing(true)
	}

	return (
		<View className="flex-1 bg-background">
			{showContent ? children : null}
			{showIntro ? (
				<Animated.View
					// Taps fall through to the content beneath once the fade starts.
					pointerEvents={dismissing ? 'none' : 'auto'}
					// A flex child while shown (present from frame 1, can't drop during
					// the switch); an absolute cover during the dismiss fade so it reveals
					// the content mounting beneath.
					className={dismissing ? 'absolute inset-0 bg-background px-6' : 'flex-1 bg-background px-6'}
					style={[
						overlayStyle,
						{
							paddingTop: insets.top + LARGE_TITLE_HEADER_HEIGHT,
							paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
						},
					]}
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

					<Animated.View entering={rise(2)} className={compact ? 'gap-4 pt-5' : 'gap-6 pt-9'}>
						{features.map((feature) => (
							<FeatureRow key={feature.title} {...feature} />
						))}
					</Animated.View>

					{/* min-h keeps real air between the last feature row and the button
					    even when the content runs tall. */}
					<View className="min-h-6 grow" />

					<Animated.View entering={rise(3)} className="pb-2">
						<Button onPress={dismiss}>
							<Button.Label>Got it</Button.Label>
						</Button>
					</Animated.View>
				</Animated.View>
			) : null}
		</View>
	)
}
