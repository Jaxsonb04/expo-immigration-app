import { ScreenEmpty } from '@/components/core'
import { featherIcon } from '@/components/styled-icon'

const CommunityIcon = featherIcon('users')

/**
 * Community tab shell. The pseudonymous forum (M4) lands here. The description
 * sets the not-legal-advice, peer-support framing required by ADR-0004 and
 * MASTER_PLAN M4-T3 up front.
 */
export function CommunityScreen() {
	return (
		<ScreenEmpty
			icon={CommunityIcon}
			title="Community is coming soon"
			description="A place to ask questions and share experiences with others going through the same USCIS renewals. Posts are peer support, not legal advice."
		/>
	)
}
