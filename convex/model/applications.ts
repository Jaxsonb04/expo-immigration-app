import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import type { FormType } from '../shared/applicationShapes'
import { interviewStepKeys, requiredSlotKeys } from '../shared/interviewSteps'

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
 * only while still `needed` — attachments and waivers are never discarded.
 * Idempotent; called at creation and after each Next-save.
 */
export async function reconcileRequirements(
	ctx: MutationCtx,
	application: Doc<'applications'>,
): Promise<void> {
	const wanted = requiredSlotKeys(application.formType, application.applicationKind)
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
