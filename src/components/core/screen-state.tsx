import { Button, Spinner, Typography } from 'heroui-native'
import type { ReactNode } from 'react'
import { View } from 'react-native'

import type { StyledIconComponent } from '@/components/styled-icon'

/** Centered, full-height container shared by every screen state. */
function StateShell({ children }: { children: ReactNode }) {
	return (
		<View className="flex-1 items-center justify-center gap-5 bg-background px-8">{children}</View>
	)
}

// NOTE: an optional circular icon chip is supported below, but the placeholder
// screens ship icon-less on purpose. The `@react-native-vector-icons` glyph map
// is newer than the bundled TTFs, so many in-screen glyphs (e.g. lucide
// `sparkles`, feather `clock`) fall through to the system font and render as a
// stray emoji/□. Resolve that font/glyph-map mismatch before leaning on
// decorative in-screen icons (needed for M1-T3 chat UI).
/** Circular icon chip used by the empty and error states when an icon renders. */
function StateIcon({ icon: Icon }: { icon: StyledIconComponent }) {
	return (
		<View className="h-16 w-16 items-center justify-center rounded-full bg-surface">
			<Icon size={26} className="text-muted" />
		</View>
	)
}

/** Loading placeholder for a screen awaiting its first data. */
export function ScreenLoading({ label }: { label?: string }) {
	return (
		<StateShell>
			<Spinner />
			{label ? (
				<Typography.Paragraph color="muted" className="text-center text-sm">
					{label}
				</Typography.Paragraph>
			) : null}
		</StateShell>
	)
}

type ScreenEmptyProps = {
	icon?: StyledIconComponent
	title: string
	description?: string
	action?: { label: string; onPress: () => void }
}

/** Empty state: no data yet, optionally with a single primary action. */
export function ScreenEmpty({ icon, title, description, action }: ScreenEmptyProps) {
	return (
		<StateShell>
			{icon ? <StateIcon icon={icon} /> : null}
			<View className="gap-2">
				<Typography.Heading className="text-center text-xl font-semibold">{title}</Typography.Heading>
				{description ? (
					<Typography.Paragraph color="muted" className="text-center text-base leading-relaxed">
						{description}
					</Typography.Paragraph>
				) : null}
			</View>
			{action ? (
				<Button variant="secondary" onPress={action.onPress}>
					<Button.Label>{action.label}</Button.Label>
				</Button>
			) : null}
		</StateShell>
	)
}

type ScreenErrorProps = {
	icon?: StyledIconComponent
	title?: string
	description?: string
	onRetry?: () => void
}

/** Error state with an optional retry affordance. */
export function ScreenError({
	icon,
	title = 'Something went wrong',
	description,
	onRetry,
}: ScreenErrorProps) {
	return (
		<StateShell>
			{icon ? <StateIcon icon={icon} /> : null}
			<View className="gap-2">
				<Typography.Heading className="text-center text-xl font-semibold">{title}</Typography.Heading>
				{description ? (
					<Typography.Paragraph color="muted" className="text-center text-base leading-relaxed">
						{description}
					</Typography.Paragraph>
				) : null}
			</View>
			{onRetry ? (
				<Button variant="secondary" onPress={onRetry}>
					<Button.Label>Try again</Button.Label>
				</Button>
			) : null}
		</StateShell>
	)
}
