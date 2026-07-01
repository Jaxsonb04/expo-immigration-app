import { ApplicantField } from './new-application.applicant-field'
import { DependentNameField } from './new-application.dependent-name-field'
import { Header } from './new-application.header'
import { SituationField } from './new-application.situation-field'
import { Submit } from './new-application.submit'

/**
 * The create-flow namespace. Field parts are `withForm` consumers bound to
 * `newApplicationFormOptions`, so they can be reordered or reused in another
 * layout by passing the same form instance.
 */
export const NewApplication = {
	Header,
	ApplicantField,
	DependentNameField,
	SituationField,
	Submit,
}
