import { formOptions } from '@tanstack/react-form'

export type NewApplicationValues = {
	applicantChoice: string
	dependentName: string
	situationKey: string
}

// Shared form options so each withForm part binds to the same form shape
// (ADR-0013 pattern: one form instance owned by the screen, parts as
// withForm consumers).
export const newApplicationFormOptions = formOptions({
	defaultValues: {
		applicantChoice: '',
		dependentName: '',
		situationKey: '',
	} as NewApplicationValues,
})

export const requiredChoice = ({ value }: { value: string }) =>
	value ? undefined : 'Choose an option'
