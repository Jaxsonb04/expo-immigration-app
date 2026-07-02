import type {
	ApplicationKind,
	CaseStatus,
	FormType,
} from '@convex/shared/applicationShapes'

// Plain labels first, technical labels second (REARCHITECTURE.md
// "Terminology"): display copy is composed from formType + applicationKind —
// never stored, never the raw form number as the primary label.

const productNoun: Record<FormType, string> = {
	i765: 'Work Permit',
	i90: 'Green Card',
}

const formNumber: Record<FormType, string> = {
	i765: 'Form I-765',
	i90: 'Form I-90',
}

export function situationLabel(
	formType: FormType,
	applicationKind: ApplicationKind,
): { primary: string; secondary: string } {
	const product = productNoun[formType]
	const primary =
		applicationKind === 'initial'
			? `First ${product}`
			: `${product} ${applicationKind === 'renewal' ? 'renewal' : 'replacement'}`
	return { primary, secondary: formNumber[formType] }
}

const requirementLabels: Record<string, string> = {
	eadCard: 'Current EAD card',
	passportPhoto: 'Passport-style photo',
	passport: 'Passport',
	i94: 'I-94 record',
	permanentResidentCard: 'Permanent Resident Card',
}

export function requirementLabel(requirementKey: string): string {
	return requirementLabels[requirementKey] ?? requirementKey
}

export const caseStatusLabels: Record<CaseStatus, string> = {
	caseReceived: 'Case received',
	biometrics: 'Biometrics',
	requestForEvidence: 'Request for Evidence',
	approved: 'Approved',
	cardBeingProduced: 'Card is being produced',
	cardMailed: 'Card was mailed',
	cardDelivered: 'Card was delivered',
}

export function progressLabel(application: {
	status: 'draft' | 'filed' | 'closed'
	completedStepCount: number
	totalStepCount: number
	isUnlocked?: boolean
}): string {
	if (application.status === 'filed') return 'Filed — tracking'
	if (application.status === 'closed') return 'Closed'
	if (application.completedStepCount >= application.totalStepCount - 1) {
		return application.isUnlocked ? 'Ready to file' : 'Ready to review'
	}
	return `Step ${Math.min(application.completedStepCount + 1, application.totalStepCount)} of ${application.totalStepCount}`
}

export function relativeTime(at: number): string {
	const deltaMs = Date.now() - at
	const minutes = Math.round(deltaMs / 60_000)
	if (minutes < 1) return 'just now'
	if (minutes < 60) return `${minutes}m ago`
	const hours = Math.round(minutes / 60)
	if (hours < 24) return `${hours}h ago`
	const days = Math.round(hours / 24)
	if (days < 30) return `${days}d ago`
	const months = Math.round(days / 30)
	return `${months}mo ago`
}

export function formatIsoDate(isoDate: string): string {
	const [year, month, day] = isoDate.split('-').map(Number)
	const date = new Date(year!, (month ?? 1) - 1, day ?? 1)
	return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}
