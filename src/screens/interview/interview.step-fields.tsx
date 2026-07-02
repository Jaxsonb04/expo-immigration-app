import type { ComponentProps } from 'react'
import { useInterview } from './interview.context'
import { stepBodies, type StepBodyKey } from './steps'

/** The screen's single `useAppForm` instance (ADR-0013). */
export type InterviewForm = ComponentProps<(typeof stepBodies)['legal-name']>['form']

/**
 * Renders the current step's fields by joining the step metadata to its body
 * component. The form travels as a prop (withForm pattern); everything else
 * comes from context.
 */
export function StepFields(props: { form: InterviewForm }) {
	const { step, application } = useInterview()
	const Body = stepBodies[step.key as StepBodyKey]
	if (Body === undefined) {
		throw new Error(`No interview body for step "${step.key}"`)
	}
	return (
		<Body
			form={props.form}
			applicationKind={application.applicationKind}
			formType={application.formType}
		/>
	)
}
