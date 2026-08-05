type TabIntroState = {
	dismissed: boolean | undefined
	dismissing: boolean
	acknowledged: boolean
}

export function resolveTabIntroVisibility({ dismissed, dismissing, acknowledged }: TabIntroState) {
	return {
		showIntro: (dismissed === false || dismissing) && !acknowledged,
		showContent: dismissed !== false || dismissing || acknowledged,
	}
}
