import { formOptions } from '@tanstack/react-form'

export type NewApplicationValues = {
	applicantChoice: string
	dependentName: string
	situationKey: string
	/** I-90 pre-screen answer (Part 2 Item 1); '' unless an I-90 situation is chosen. */
	i90CardStatus: string
}

// Shared form options so each withForm part binds to the same form shape
// (ADR-0013 pattern: one form instance owned by the screen, parts as
// withForm consumers).
export const newApplicationFormOptions = formOptions({
	defaultValues: {
		applicantChoice: '',
		dependentName: '',
		situationKey: '',
		i90CardStatus: '',
	} as NewApplicationValues,
})

export const requiredChoice = ({ value }: { value: string }) =>
	value ? undefined : 'Choose an option'
