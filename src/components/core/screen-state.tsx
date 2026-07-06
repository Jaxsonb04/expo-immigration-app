import { Button, Spinner, Typography } from 'heroui-native'
import type { ReactNode } from 'react'
import { View } from 'react-native'

import { featherIcon, type StyledIconComponent } from '@/components/styled-icon'

const DefaultErrorIcon = featherIcon('alert-triangle')

/** Centered, full-height container shared by every screen state. */
function StateShell({ children }: { children: ReactNode }) {
	return (
		<View className="flex-1 items-center justify-center gap-5 bg-background px-8">{children}</View>
	)
}

/** Circular icon chip used by the empty and error states. */
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
	title?: string
	description?: string
	onRetry?: () => void
}

/** Error state with an optional retry affordance. */
export function ScreenError({
	title = 'Something went wrong',
	description,
	onRetry,
}: ScreenErrorProps) {
	return (
		<StateShell>
			<StateIcon icon={DefaultErrorIcon} />
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
