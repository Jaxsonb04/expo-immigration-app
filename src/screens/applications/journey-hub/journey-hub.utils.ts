import { Alert } from 'react-native'

/** Walkthrough-phase stub for surfaces that land in later build phases. */
export function comingSoon(feature: string): void {
	Alert.alert(feature, 'This part of the walkthrough arrives in the next build phase.')
}
