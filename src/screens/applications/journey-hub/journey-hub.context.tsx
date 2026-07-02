import { createContext, use, type ReactNode } from 'react'
import type { ApplicationDetail } from './journey-hub.data'

// Provider-led state sharing: every spine section reads the application
// detail from context, so sections can be reordered, dropped, or moved into
// other layouts without touching their internals.

const JourneyHubContext = createContext<ApplicationDetail | null>(null)

export function JourneyHubProvider(props: { detail: ApplicationDetail; children: ReactNode }) {
	return <JourneyHubContext value={props.detail}>{props.children}</JourneyHubContext>
}

export function useJourneyHub(): ApplicationDetail {
	const detail = use(JourneyHubContext)
	if (detail === null) {
		throw new Error('Journey Hub components must be rendered inside <JourneyHub.Provider>')
	}
	return detail
}

/** Every pre-Review interview step is complete. */
export function useInterviewDone(): boolean {
	const { application } = useJourneyHub()
	return application.completedStepCount >= application.totalStepCount - 1
}
