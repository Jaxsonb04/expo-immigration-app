import { createContext, use, type ReactNode } from 'react'
import type { ApplicationDetail } from './interview.data'
import type { StepDescriptor } from './interview.form'

// Provider-led state sharing: header, question, step fields, and footer all
// read the wizard state from context, so the screen only arranges parts.

export type InterviewState = {
	application: ApplicationDetail['application']
	step: StepDescriptor
	stepNumber: number
	totalSteps: number
	saving: boolean
	isLast: boolean
	next: () => void
	back: () => void
	close: () => void
}

const InterviewContext = createContext<InterviewState | null>(null)

export function InterviewProvider(props: { state: InterviewState; children: ReactNode }) {
	return <InterviewContext value={props.state}>{props.children}</InterviewContext>
}

export function useInterview(): InterviewState {
	const state = use(InterviewContext)
	if (state === null) {
		throw new Error('Interview components must be rendered inside <Interview.Provider>')
	}
	return state
}
