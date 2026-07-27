import { query } from './_generated/server'
import type { Doc } from './_generated/dataModel'
import type { QueryCtx } from './_generated/server'
import { requireOwnerId } from './lib/auth'
import { requirementsForReadiness } from './model/applications'
import { isEntitledToCleanExport } from './model/entitlements'
import { filingWindowDays } from './shared/applicationShapes'
import { requiredSlotKeys } from './shared/interviewSteps'
import { isRequirementSatisfied } from './shared/readiness'

// Home dashboard (decision 8): everything here is derived from bounded,
// indexed reads — no events table, no derived view-model rows, no client-side
// scans. Attention items come from exactly two sources: documents expiring
// inside the filing window, and unresolved current-contract evidence on draft
// applications. The latter is derived from answers, not raw `needed` rows, so
// a legacy missing row or an unconfirmed attachment still fails closed.

const DAY_MS = 24 * 60 * 60 * 1000
const RECENT_ACTIVITY_LIMIT = 5

function isoDate(ms: number): string {
	return new Date(ms).toISOString().slice(0, 10)
}

async function applicantNameLookup(ctx: QueryCtx, ownerId: string) {
	const applicants = await ctx.db
		.query('applicants')
		.withIndex('by_ownerId', (q) => q.eq('ownerId', ownerId))
		.take(50)
	return new Map(applicants.map((a) => [a._id, a.displayName]))
}

async function unresolvedDraftEvidence(
	ctx: QueryCtx,
	applications: readonly Doc<'applications'>[],
) {
	const perApplication = await Promise.all(
		applications.map(async (application) => {
			const [draft, slots] = await Promise.all([
				ctx.db
					.query('applicationDrafts')
					.withIndex('by_applicationId', (q) => q.eq('applicationId', application._id))
					.unique(),
				ctx.db
					.query('applicationDocuments')
					.withIndex('by_applicationId', (q) => q.eq('applicationId', application._id))
					.take(50),
			])
			// A missing draft is a corrupt application, not evidence that any
			// particular document is needed. getApplication surfaces that
			// stronger invariant failure when the owner opens it.
			if (draft === null) return []

			const expectedKeys = requiredSlotKeys(
				application.formType,
				application.applicationKind,
				draft.answers,
			)
			const activeSlots = slots.filter((slot) => expectedKeys.includes(slot.requirementKey))
			const readinessInputs = await requirementsForReadiness(
				ctx,
				application,
				activeSlots,
				draft.evidenceRevision ?? 0,
			)
			const inputByKey = new Map(readinessInputs.map((slot) => [slot.requirementKey, slot]))
			const persistedSlotByKey = new Map(activeSlots.map((slot) => [slot.requirementKey, slot]))

			return expectedKeys
				.filter(
					(requirementKey) =>
						!isRequirementSatisfied(requirementKey, inputByKey.get(requirementKey)),
				)
				.map((requirementKey) => ({
					// The Documents screen uses this only as a React key. A
					// synthetic key keeps a missing legacy row visible until
					// the Journey Hub's idempotent reconciliation backfills it.
					slotId:
						persistedSlotByKey.get(requirementKey)?._id ?? `${application._id}:${requirementKey}`,
					applicationId: application._id,
					applicantId: application.applicantId,
					requirementKey,
					formType: application.formType,
					applicationKind: application.applicationKind,
				}))
		}),
	)
	return perApplication.flat()
}

export const getHomeDashboard = query({
	args: {},
	handler: async (ctx) => {
		const ownerId = await requireOwnerId(ctx)
		const names = await applicantNameLookup(ctx, ownerId)

		// Active applications: draft + filed (closed is excluded by definition).
		const [drafts, filed] = await Promise.all([
			ctx.db
				.query('applications')
				.withIndex('by_ownerId_and_status', (q) => q.eq('ownerId', ownerId).eq('status', 'draft'))
				.take(50),
			ctx.db
				.query('applications')
				.withIndex('by_ownerId_and_status', (q) => q.eq('ownerId', ownerId).eq('status', 'filed'))
				.take(50),
		])
		const entitlements = await ctx.db
			.query('entitlements')
			.withIndex('by_ownerId', (q) => q.eq('ownerId', ownerId))
			.take(100)
		const unlockedApplicationIds = new Set(
			entitlements.filter((e) => e.status === 'active').map((e) => e.applicationId),
		)
		const activeApplications = [...drafts, ...filed]
			.sort((a, b) => b.updatedAt - a.updatedAt)
			.map((application) => ({
				_id: application._id,
				applicantId: application.applicantId,
				applicantName: names.get(application.applicantId) ?? 'Unknown',
				formType: application.formType,
				applicationKind: application.applicationKind,
				status: application.status,
				currentStepKey: application.currentStepKey,
				completedStepCount: application.completedStepCount,
				totalStepCount: application.totalStepCount,
				isUnlocked: isEntitledToCleanExport(unlockedApplicationIds.has(application._id)),
				filedAt: application.filedAt,
				updatedAt: application.updatedAt,
			}))
		const activeApplicationIds = new Set(activeApplications.map((a) => a._id))

		// Attention source 1: current documents expiring inside the window.
		const documents = await ctx.db
			.query('documents')
			.withIndex('by_ownerId', (q) => q.eq('ownerId', ownerId))
			.take(100)
		const today = isoDate(Date.now())
		const windowEnd = isoDate(Date.now() + filingWindowDays * DAY_MS)
		const expiringDocuments = documents.filter(
			(d) =>
				d.supersededById === undefined &&
				d.expiryDate !== undefined &&
				d.expiryDate >= today &&
				d.expiryDate <= windowEnd,
		)
		const expiringItems = await Promise.all(
			expiringDocuments.map(async (document) => {
				const slots = await ctx.db
					.query('applicationDocuments')
					.withIndex('by_documentId', (q) => q.eq('documentId', document._id))
					.take(50)
				return {
					kind: 'documentExpiring' as const,
					documentId: document._id,
					documentType: document.type,
					label: document.label,
					applicantName: names.get(document.applicantId) ?? 'Unknown',
					expiryDate: document.expiryDate!,
					affectsApplicationCount: slots.filter((s) => activeApplicationIds.has(s.applicationId))
						.length,
				}
			}),
		)

		// Attention source 2: every unresolved answer-aware requirement on a
		// draft, including a missing legacy row, stale confirmation, superseded
		// file, wrong-applicant legacy attachment, or unconfirmed physical item.
		const unresolvedEvidence = await unresolvedDraftEvidence(ctx, drafts)
		const neededItems = unresolvedEvidence.map((item) => ({
			kind: 'documentNeeded' as const,
			applicationId: item.applicationId,
			requirementKey: item.requirementKey,
			applicantName: names.get(item.applicantId) ?? 'Unknown',
			formType: item.formType,
			applicationKind: item.applicationKind,
		}))

		// Recent activity: a brief bounded merge of row timestamps (decision 8).
		const cases = await ctx.db
			.query('cases')
			.withIndex('by_ownerId_and_receiptNumber', (q) => q.eq('ownerId', ownerId))
			.take(50)
		const recentActivity = [
			...activeApplications.map((a) => ({
				kind: 'application' as const,
				at: a.updatedAt,
				applicationId: a._id,
				applicantName: a.applicantName,
				formType: a.formType,
				applicationKind: a.applicationKind,
			})),
			...documents
				.filter((d) => d.supersededById === undefined)
				.map((d) => ({
					kind: 'document' as const,
					at: d.updatedAt,
					documentId: d._id,
					documentType: d.type,
					label: d.label,
					applicantName: names.get(d.applicantId) ?? 'Unknown',
				})),
			...cases.map((c) => ({
				kind: 'case' as const,
				at: c.updatedAt,
				caseId: c._id,
				receiptNumber: c.receiptNumber,
				status: c.status,
			})),
		]
			.sort((a, b) => b.at - a.at)
			.slice(0, RECENT_ACTIVITY_LIMIT)

		return {
			summary: {
				expiringDocumentsCount: expiringItems.length,
				activeApplicationsCount: activeApplications.length,
			},
			activeApplications,
			attentionItems: [
				...expiringItems.sort((a, b) => (a.expiryDate < b.expiryDate ? -1 : 1)),
				...neededItems,
			],
			recentActivity,
		}
	},
})

/** Documents tab payload: the vault plus needed-document slots (IA direction). */
export const getVault = query({
	args: {},
	handler: async (ctx) => {
		const ownerId = await requireOwnerId(ctx)
		const names = await applicantNameLookup(ctx, ownerId)

		const [documents, drafts] = await Promise.all([
			ctx.db
				.query('documents')
				.withIndex('by_ownerId', (q) => q.eq('ownerId', ownerId))
				.take(100),
			ctx.db
				.query('applications')
				.withIndex('by_ownerId_and_status', (q) => q.eq('ownerId', ownerId).eq('status', 'draft'))
				.take(50),
		])
		const unresolvedEvidence = await unresolvedDraftEvidence(ctx, drafts)
		const neededWithContext = unresolvedEvidence.map((item) => ({
			slotId: item.slotId,
			applicationId: item.applicationId,
			requirementKey: item.requirementKey,
			applicantName: names.get(item.applicantId) ?? 'Unknown',
			formType: item.formType,
			applicationKind: item.applicationKind,
		}))

		return {
			documents: documents
				.map((d) => ({
					...d,
					applicantName: names.get(d.applicantId) ?? 'Unknown',
					isCurrent: d.supersededById === undefined,
				}))
				.sort((a, b) => b.updatedAt - a.updatedAt),
			neededSlots: neededWithContext,
		}
	},
})
