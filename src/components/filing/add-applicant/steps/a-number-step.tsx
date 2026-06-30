import { router } from 'expo-router'
import { InterviewStep } from '../../interview-step'
import { useAddApplicantForm } from '../provider'
import { identitySectionSchema } from '../wizard-form'

/**
 * Step page 2 — A-Number. Scoped to the `identity` section; its strict per-step
 * schema reuses the shared A-Number format regex from `profileShape`. Reads the
 * shared form from context and pushes the confirm page on a valid Next.
 */
export function ANumberStep() {
	const form = useAddApplicantForm()
	return (
		<form.FormGroup
			name="identity"
			validators={{ onDynamic: identitySectionSchema }}
			onGroupSubmit={() => router.push('/add-applicant/confirm')}
		>
			{(group) => (
				<form.Subscribe selector={(s) => identitySectionSchema.safeParse(s.values.identity).success}>
					{(canAdvance) => (
						<InterviewStep
							heading="What's your A-Number?"
							helpTitle="Alien Registration Number"
							help="Your A-Number (e.g. A012345678) is the 8–9 digit number USCIS uses to identify you. Find it on your green card, work permit, or any notice you've received. It stays the same across every filing."
							onBack={() => router.back()}
							onNext={() => group.handleSubmit()}
							canAdvance={canAdvance}
						>
							<form.AppField name="identity.aNumber">
								{(field) => (
									<field.TextField
										label="A-Number"
										placeholder="A000000000"
										autoCapitalize="characters"
										autoCorrect={false}
										description="The same number across every filing."
									/>
								)}
							</form.AppField>
						</InterviewStep>
					)}
				</form.Subscribe>
			)}
		</form.FormGroup>
	)
}
