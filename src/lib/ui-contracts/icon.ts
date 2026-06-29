import type { ReactNode } from 'react'

/** Props passed to the icon component (size and className). */
export type StyledIconProps = {
	size?: number
	className?: string
}

/** Icon component returned by styledIcon (e.g. for quick actions or lists). */
export type StyledIconComponent = (props: StyledIconProps) => ReactNode
