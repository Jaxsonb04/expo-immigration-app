import { router } from 'expo-router'
import { InterviewStep } from '../../interview-step'
import { useAddApplicantForm } from '../provider'
import { nameSectionSchema } from '../wizard-form'

/**
 * Step page 1 — legal name. Reads the shared form from context (no props), scopes
 * the `name` section with `form.FormGroup`, and on a valid Next pushes the next
 * step *page* (validate-then-advance, ADR-0013). Back dismisses the modal.
 */
export function NameStep() {
	const form = useAddApplicantForm()
	return (
		<form.FormGroup
			name="name"
			validators={{ onDynamic: nameSectionSchema }}
			onGroupSubmit={() => router.push('/add-applicant/a-number')}
		>
			{(group) => (
				<form.Subscribe selector={(s) => nameSectionSchema.safeParse(s.values.name).success}>
					{(canAdvance) => (
						<InterviewStep
							heading="What's your legal name?"
							helpTitle="Use your legal name"
							help="Enter your name exactly as it appears on your government documents — passport, green card, or work permit. USCIS matches every filing to the name already on record."
							onBack={() => router.back()}
							onNext={() => group.handleSubmit()}
							canAdvance={canAdvance}
						>
							<form.AppField name="name.givenName">
								{(field) => (
									<field.TextField
										label="First (given) name"
										isRequired
										autoCapitalize="words"
										focusNextOnSubmit
									/>
								)}
							</form.AppField>
							<form.AppField name="name.familyName">
								{(field) => (
									<field.TextField label="Last (family) name" isRequired autoCapitalize="words" />
								)}
							</form.AppField>
						</InterviewStep>
					)}
				</form.Subscribe>
			)}
		</form.FormGroup>
	)
}
