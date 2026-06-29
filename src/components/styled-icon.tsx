import Feather from '@react-native-vector-icons/feather/static'
import FontAwesome from '@react-native-vector-icons/fontawesome/static'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import Octicons from '@react-native-vector-icons/octicons/static'
import Lucide from '@react-native-vector-icons/lucide/static'
import Ion from '@react-native-vector-icons/ionicons/static'
import type { ComponentProps, ReactNode } from 'react'
import { withUniwind } from 'uniwind'
import { Platform } from 'react-native'
import type { StyledIconComponent, StyledIconProps } from '@/lib/ui-contracts/icon'

export type { StyledIconComponent, StyledIconProps } from '@/lib/ui-contracts/icon'

export const StyledFeatherIcon = withUniwind(Feather)
export const StyledFontAwesomeIcon = withUniwind(FontAwesome)
export const StyledOctIcon = withUniwind(Octicons)
export const StyledMaterialCommunityIcons = withUniwind(MaterialCommunityIcons)
export const StyledIonIcon = withUniwind(Ion)
export const StyledLucideIcon = withUniwind(Lucide)

export type FeatherIconName = ComponentProps<typeof Feather>['name']
type FontAwesomeIconName = ComponentProps<typeof FontAwesome>['name']
type OctIconName = ComponentProps<typeof Octicons>['name']
type MaterialCommunityIconsName = ComponentProps<typeof MaterialCommunityIcons>['name']
type IonIconName = ComponentProps<typeof Ion>['name']
type LucideIconName = ComponentProps<typeof Lucide>['name']
/** Config for styledIcon: family + name. Name is type-safe per family. */
export type StyledIconConfig =
	| { family: 'feather'; name: FeatherIconName }
	| { family: 'FontAwesome'; name: FontAwesomeIconName }
	| { family: 'octicons'; name: OctIconName }
	| { family: 'materialcommunityicons'; name: MaterialCommunityIconsName }
	| { family: 'ionicons'; name: IonIconName }
	| { family: 'lucide'; name: LucideIconName }

/**
 * Internal render type for the resolved family component. The public input
 * (StyledIconConfig) still enforces a valid name per family at call sites; this
 * only widens the name back to the family union for the single render path,
 * since TypeScript cannot correlate config.family with config.name after lookup.
 */
type RenderableIcon = (props: {
	name: StyledIconConfig['name']
	size?: number
	className?: string
	color?: string
}) => ReactNode

/** Maps each icon family to its styled component (single render path). */
const COMPONENT_BY_FAMILY: Record<StyledIconConfig['family'], RenderableIcon> = {
	feather: StyledFeatherIcon as RenderableIcon,
	FontAwesome: StyledFontAwesomeIcon as RenderableIcon,
	octicons: StyledOctIcon as RenderableIcon,
	materialcommunityicons: StyledMaterialCommunityIcons as RenderableIcon,
	ionicons: StyledIonIcon as RenderableIcon,
	lucide: StyledLucideIcon as RenderableIcon,
}

/**
 * Returns a styled icon component for the given family and name.
 * Use for list items, headers, or anywhere you need a Feather, FontAwesome, Octicons, or MaterialCommunityIcons icon.
 * TypeScript will enforce valid icon names per family.
 *
 * @example
 * const BookIcon = styledIcon({ family: 'feather', name: 'book' })
 * const LyftIcon = styledIcon({ family: 'FontAwesome', name: 'lyft' })
 */
export function styledIcon(config: StyledIconConfig): StyledIconComponent {
	const iconComponent: StyledIconComponent = ({ size = 22, className }: StyledIconProps) => {
		const Icon = COMPONENT_BY_FAMILY[config.family]
		return (
			<Icon
				name={config.name}
				size={size}
				className={className}
				// for web, add color=inherit
				{...(Platform.OS === 'web' ? { color: 'inherit' } : {})}
			/>
		)
	}
	Object.assign(iconComponent, { displayName: `${config.family}-${String(config.name)}-icon` })
	return iconComponent
}

/** Feather icon helper. Prefer styledIcon({ family: 'feather', name }) for consistency. */
export function featherIcon(name: FeatherIconName): StyledIconComponent {
	return styledIcon({ family: 'feather', name })
}

/** Octicons icon helper. Prefer styledIcon({ family: 'octicons', name }) for consistency. */
export function octiconsIcon(name: OctIconName): StyledIconComponent {
	return styledIcon({ family: 'octicons', name })
}

/** MaterialIcons icon helper. Prefer styledIcon({ family: 'materialicons', name }) for consistency. */
export function materialCommunityIconsIcon(name: MaterialCommunityIconsName): StyledIconComponent {
	return styledIcon({ family: 'materialcommunityicons', name })
}

/** Lucide icon helper. Prefer styledIcon({ family: 'lucide', name }) for consistency. */
export function lucideIcon(name: LucideIconName): StyledIconComponent {
	return styledIcon({ family: 'lucide', name })
}
