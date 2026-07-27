import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import type { FormType } from '../shared/applicationShapes'
import { interviewStepKeys, requiredSlotKeys } from '../shared/interviewSteps'
import type { RequirementReadinessInput } from '../shared/readiness'

/**
 * Load an application and enforce ownership. Not-found and not-owned are the
 * same error so the API never leaks whether an id exists.
 */
export async function getOwnedApplication(
	ctx: QueryCtx | MutationCtx,
	ownerId: string,
	applicationId: Id<'applications'>,
): Promise<Doc<'applications'>> {
	const application = await ctx.db.get('applications', applicationId)
	if (application === null || application.ownerId !== ownerId) {
		throw new Error('Application not found')
	}
	return application
}

export async function getDraftForApplication(
	ctx: QueryCtx | MutationCtx,
	applicationId: Id<'applications'>,
): Promise<Doc<'applicationDrafts'>> {
	const draft = await ctx.db
		.query('applicationDrafts')
		.withIndex('by_applicationId', (q) => q.eq('applicationId', applicationId))
		.unique()
	if (draft === null) throw new Error('Draft missing for application')
	return draft
}

/** Progress summary derived from the step blueprint (decision 5). */
export function computeProgress(
	formType: FormType,
	stepCompletion: Record<string, boolean>,
): { currentStepKey: string; completedStepCount: number; totalStepCount: number } {
	const keys = interviewStepKeys[formType]
	const completedStepCount = keys.filter((key) => stepCompletion[key] === true).length
	const currentStepKey = keys.find((key) => stepCompletion[key] !== true) ?? keys[keys.length - 1]!
	return { currentStepKey, completedStepCount, totalStepCount: keys.length }
}

/**
 * Ensure the application's requirement slots match its template (decision 7):
 * missing slots are created as `needed`; template-removed slots are dropped
 * only while still `needed` — resolved rows are never discarded.
 * Idempotent; called at creation and after each Next-save. Loads the draft so
 * answer-aware requirements (an I-90 legal name change requires evidence)
 * reconcile on every save.
 */
export async function reconcileRequirements(
	ctx: MutationCtx,
	application: Doc<'applications'>,
): Promise<void> {
	const draft = await getDraftForApplication(ctx, application._id)
	const wanted = requiredSlotKeys(application.formType, application.applicationKind, draft.answers)
	const existing = await ctx.db
		.query('applicationDocuments')
		.withIndex('by_applicationId', (q) => q.eq('applicationId', application._id))
		.take(50)
	const now = Date.now()

	for (const requirementKey of wanted) {
		if (!existing.some((slot) => slot.requirementKey === requirementKey)) {
			await ctx.db.insert('applicationDocuments', {
				ownerId: application.ownerId,
				applicationId: application._id,
				requirementKey,
				status: 'needed',
				updatedAt: now,
			})
		}
	}
	for (const slot of existing) {
		if (!wanted.includes(slot.requirementKey) && slot.status === 'needed') {
			await ctx.db.delete('applicationDocuments', slot._id)
		}
	}
}

/**
 * Join persisted slots to the minimum document facts the pure readiness
 * contract needs. This rechecks legacy rows instead of assuming every
 * historical `attached` state was produced by today's guarded mutation.
 */
export async function requirementsForReadiness(
	ctx: QueryCtx | MutationCtx,
	application: Doc<'applications'>,
	slots: readonly Doc<'applicationDocuments'>[],
	evidenceRevision: number,
): Promise<RequirementReadinessInput[]> {
	return await Promise.all(
		slots.map(async (slot) => {
			const document =
				slot.documentId === undefined ? null : await ctx.db.get('documents', slot.documentId)
			return {
				requirementKey: slot.requirementKey,
				status: slot.status,
				documentId: slot.documentId,
				confirmedDocumentId: slot.confirmedDocumentId,
				confirmationVersion: slot.confirmationVersion,
				confirmationRevision: slot.confirmationRevision,
				evidenceRevision,
				documentType: document?.type,
				// A versioned filing remains bound to the exact file reviewed at
				// filing time even if the Vault later receives a newer version.
				documentIsCurrent:
					document !== null &&
					(application.status !== 'draft' && application.filedAt !== undefined
						? true
						: document.supersededById === undefined),
				documentMatchesApplicant:
					document !== null &&
					document.ownerId === application.ownerId &&
					document.applicantId === application.applicantId,
			}
		}),
	)
}
