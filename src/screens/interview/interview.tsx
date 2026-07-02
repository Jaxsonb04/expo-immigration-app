import { InterviewProvider } from './interview.context'
import { Footer } from './interview.footer'
import { Header } from './interview.header'
import { Question } from './interview.question'
import { StepFields } from './interview.step-fields'

/**
 * The interview namespace (ADR-0012/0013). The screen owns the single form
 * instance and the step index; these parts read the wizard state from
 * <Interview.Provider> so they can be rearranged without prop drilling.
 */
export const Interview = {
	Provider: InterviewProvider,
	Header,
	Question,
	StepFields,
	Footer,
}
