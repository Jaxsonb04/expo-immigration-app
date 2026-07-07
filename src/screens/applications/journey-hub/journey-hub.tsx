import { JourneyHubProvider } from './journey-hub.context'
import { Documents } from './journey-hub.documents'
import { Header } from './journey-hub.header'
import { LastSaved } from './journey-hub.last-saved'
import { Prepare } from './journey-hub.prepare'
import { ReviewPay } from './journey-hub.review-pay'
import { Track } from './journey-hub.track'

/**
 * The Journey Hub namespace (decision 10): the Prepare | Documents |
 * Review & File | Track spine as provider-fed parts. Every part reads from
 * `JourneyHub.Provider`, so layouts can rearrange or drop sections without
 * editing their internals.
 */
export const JourneyHub = {
	Provider: JourneyHubProvider,
	Header,
	Prepare,
	Documents,
	ReviewPay,
	Track,
	LastSaved,
}
