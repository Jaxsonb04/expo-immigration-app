import { AddCaseForm } from './add-form'
import { CaseCard } from './card'
import { CaseStatusTimeline } from './status-timeline'

/**
 * The multi-part case UI as one compound namespace. `CasesScreen` composes the
 * members — `<Case.Card />`, `<Case.AddForm />` — and `Case.Card` in turn
 * renders `<Case.StatusTimeline />` (exposed for reuse). Grouping them under a
 * single `Case` root keeps the relationship between the parts legible.
 */
export const Case = {
	Card: CaseCard,
	StatusTimeline: CaseStatusTimeline,
	AddForm: AddCaseForm,
}
