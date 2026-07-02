import { query } from './_generated/server'
import type { Doc } from './_generated/dataModel'
import type { QueryCtx } from './_generated/server'
import { requireOwnerId } from './lib/auth'
import { filingWindowDays } from './shared/applicationShapes'

// Home dashboard (decision 8): everything here is derived from bounded,
// indexed reads — no events table, no derived view-model rows, no client-side
// scans. Attention items come from exactly two sources: documents expiring
// inside the filing window, and needed-but-missing requirement slots on
// active applications.

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
				isUnlocked: unlockedApplicationIds.has(application._id),
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

		// Attention source 2: needed slots on active applications.
		const neededSlots = await ctx.db
			.query('applicationDocuments')
			.withIndex('by_ownerId_and_status', (q) => q.eq('ownerId', ownerId).eq('status', 'needed'))
			.take(50)
		const neededItems = neededSlots
			.filter((slot) => activeApplicationIds.has(slot.applicationId))
			.map((slot) => {
				const application = activeApplications.find((a) => a._id === slot.applicationId)!
				return {
					kind: 'documentNeeded' as const,
					applicationId: slot.applicationId,
					requirementKey: slot.requirementKey,
					applicantName: application.applicantName,
					formType: application.formType,
					applicationKind: application.applicationKind,
				}
			})

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

		const documents = await ctx.db
			.query('documents')
			.withIndex('by_ownerId', (q) => q.eq('ownerId', ownerId))
			.take(100)

		const neededSlots = await ctx.db
			.query('applicationDocuments')
			.withIndex('by_ownerId_and_status', (q) => q.eq('ownerId', ownerId).eq('status', 'needed'))
			.take(50)
		const neededWithContext = await Promise.all(
			neededSlots.map(async (slot) => {
				const application: Doc<'applications'> | null = await ctx.db.get(
					'applications',
					slot.applicationId,
				)
				if (application === null || application.status === 'closed') return null
				return {
					slotId: slot._id,
					applicationId: slot.applicationId,
					requirementKey: slot.requirementKey,
					applicantName: names.get(application.applicantId) ?? 'Unknown',
					formType: application.formType,
					applicationKind: application.applicationKind,
				}
			}),
		)

		return {
			documents: documents
				.map((d) => ({
					...d,
					applicantName: names.get(d.applicantId) ?? 'Unknown',
					isCurrent: d.supersededById === undefined,
				}))
				.sort((a, b) => b.updatedAt - a.updatedAt),
			neededSlots: neededWithContext.filter((s) => s !== null),
		}
	},
})
