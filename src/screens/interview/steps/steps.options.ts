import type { ApplicationKind, FormType } from '@convex/shared/applicationShapes'
import { interviewFormOptions } from '../interview.form'

/**
 * Shared `withForm` options for every step body: same form shape as the
 * screen's single instance, plus the application situation so kind-aware
 * validators and conditional fields stay declarative.
 */
export const stepBodyOptions = {
	...interviewFormOptions,
	props: {
		applicationKind: 'renewal' as ApplicationKind,
		formType: 'i765' as FormType,
	},
}
