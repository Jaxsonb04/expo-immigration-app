import { withForm } from '@/components/form'
import { ScreeningStopNotice } from '@/components/screening-stop'
import { cardStatusOptions } from '@/screens/interview/interview.form'
import { isI90CardStatus, screenI90 } from '@convex/shared/screening'
import { newApplicationFormOptions } from './new-application.form'
import { parseSituationKey } from './new-application.situations'

/**
 * I-90 pre-screen (rendered only while an I-90 situation is selected): asks
 * which card the applicant holds BEFORE the application exists, so an
 * unsupported combination (conditional resident renewing a 2-year card) stops
 * here with an honest explanation instead of producing a dead-end draft. The
 * server enforces the same rule in createApplication.
 */
export const CardStatusField = withForm({
	...newApplicationFormOptions,
	render: function Render({ form }) {
		return (
			<form.Subscribe selector={(state) => state.values.situationKey}>
				{(situationKey) => {
					if (!situationKey.startsWith('i90:')) return null
					const { applicationKind } = parseSituationKey(situationKey)
					return (
						<>
							<form.AppField
								name="i90CardStatus"
								validators={{
									// Requirement depends on the chosen situation, so re-run when
									// it changes (clears a stale error after switching to I-765).
									onChangeListenTo: ['situationKey'],
									onChange: ({ value, fieldApi }) =>
										fieldApi.form.getFieldValue('situationKey').startsWith('i90:') &&
										value === ''
											? 'Choose your card type'
											: undefined,
								}}
							>
								{(field) => (
									<field.RadioGroupField
										label="What kind of card do you have?"
										options={[...cardStatusOptions]}
										isRequired
									/>
								)}
							</form.AppField>
							<form.Subscribe selector={(state) => state.values.i90CardStatus}>
								{(cardStatus) => {
									const screening = isI90CardStatus(cardStatus)
										? screenI90(cardStatus, applicationKind)
										: null
									return screening !== null && !screening.supported ? (
										<ScreeningStopNotice stop={screening} />
									) : null
								}}
							</form.Subscribe>
						</>
					)
				}}
			</form.Subscribe>
		)
	},
})
