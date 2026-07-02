import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { literals } from 'convex-helpers/validators'
import { zodToConvex } from 'convex-helpers/server/zod4'
import {
	applicationKinds,
	applicationStatuses,
	caseStatuses,
	documentTypes,
	entitlementSources,
	entitlementStatuses,
	formTypes,
	i765DraftAnswersShape,
	i90DraftAnswersShape,
	personFactsShape,
	requirementStatuses,
} from './shared/applicationShapes'

// Seven app-owned tables (REARCHITECTURE.md "Resolved Decisions", 2026-07-01).
// Every table is scoped by a server-derived ownerId (convex/lib/auth.ts);
// ownerIds are never accepted from clients. Better Auth owns identity in its
// own component namespace — there is no user-profile table here.

const formType = literals(...formTypes)
const applicationKind = literals(...applicationKinds)
const applicationStatus = literals(...applicationStatuses)
const requirementStatus = literals(...requirementStatuses)
const caseStatus = literals(...caseStatuses)
const documentType = literals(...documentTypes)

export default defineSchema({
	// People managed by the owner. The account holder is a lazily created row
	// flagged isSelf (at most one per owner); dependents are sibling rows.
	// `profile` holds promoted person-facts (ADR-0014) — partial until the
	// first promotion at Review.
	applicants: defineTable({
		ownerId: v.string(),
		isSelf: v.boolean(),
		displayName: v.string(),
		profile: zodToConvex(personFactsShape.partial()),
		updatedAt: v.number(),
	}).index('by_ownerId', ['ownerId']),

	// The durable product object: small and stable. High-churn interview
	// answers live in applicationDrafts; only the progress summary is patched
	// here on each Next-save (decision 5). Status transitions are explicit
	// user actions or case-link assisted (decision 6) — payment never flips
	// status.
	applications: defineTable({
		ownerId: v.string(),
		applicantId: v.id('applicants'),
		formType,
		applicationKind,
		status: applicationStatus,
		currentStepKey: v.optional(v.string()),
		completedStepCount: v.number(),
		totalStepCount: v.number(),
		filedAt: v.optional(v.number()),
		closedAt: v.optional(v.number()),
		updatedAt: v.number(),
	})
		.index('by_ownerId_and_status', ['ownerId', 'status'])
		.index('by_applicantId', ['applicantId']),

	// High-churn interview answers + per-step completion map, one row per
	// application, typed per form family (ADR-0005) via the shared Zod shapes.
	applicationDrafts: defineTable(
		v.union(
			v.object({
				ownerId: v.string(),
				applicationId: v.id('applications'),
				formType: v.literal('i765'),
				answers: zodToConvex(i765DraftAnswersShape),
				stepCompletion: v.record(v.string(), v.boolean()),
				updatedAt: v.number(),
			}),
			v.object({
				ownerId: v.string(),
				applicationId: v.id('applications'),
				formType: v.literal('i90'),
				answers: zodToConvex(i90DraftAnswersShape),
				stepCompletion: v.record(v.string(), v.boolean()),
				updatedAt: v.number(),
			}),
		),
	)
		.index('by_applicationId', ['applicationId'])
		.index('by_ownerId', ['ownerId']),

	// Explicit requirement slots (decision 7): materialized from the
	// per-(formType, applicationKind) template at creation and reconciled
	// after each Next-save. "Needed" is a row state, never absence of a row.
	applicationDocuments: defineTable({
		ownerId: v.string(),
		applicationId: v.id('applications'),
		requirementKey: v.string(),
		status: requirementStatus,
		documentId: v.optional(v.id('documents')),
		updatedAt: v.number(),
	})
		.index('by_applicationId', ['applicationId'])
		.index('by_ownerId_and_status', ['ownerId', 'status'])
		.index('by_documentId', ['documentId']),

	// Vault: append-only rows; supersession via explicit links set only by
	// "Upload new version" (decision 9). Current = supersededById unset. Two
	// passports coexist as independent rows.
	documents: defineTable({
		ownerId: v.string(),
		applicantId: v.id('applicants'),
		type: documentType,
		label: v.optional(v.string()),
		storageId: v.id('_storage'),
		expiryDate: v.optional(v.string()), // ISO date (YYYY-MM-DD)
		supersedesId: v.optional(v.id('documents')),
		supersededById: v.optional(v.id('documents')),
		updatedAt: v.number(),
	})
		.index('by_ownerId', ['ownerId'])
		.index('by_applicantId', ['applicantId']),

	// Post-filing tracking (ADR-0008): manual receipt-number entry; optional
	// one-way link to an application. statusHistory is bounded (~7 canonical
	// statuses, manual entries), so embedding is safe (decision 8).
	cases: defineTable({
		ownerId: v.string(),
		receiptNumber: v.string(),
		applicationId: v.optional(v.id('applications')),
		status: caseStatus,
		statusHistory: v.array(
			v.object({
				status: caseStatus,
				occurredAt: v.number(),
				note: v.optional(v.string()),
			}),
		),
		updatedAt: v.number(),
	})
		.index('by_ownerId_and_receiptNumber', ['ownerId', 'receiptNumber'])
		.index('by_applicationId', ['applicationId']),

	// Per-application authorization mirror (decision 11): Convex is the source
	// of truth for unlocks; written only by RevenueCat webhooks/server
	// validation (idempotent by provider ids) or the walkthrough dev stub.
	entitlements: defineTable({
		ownerId: v.string(),
		applicationId: v.id('applications'),
		status: literals(...entitlementStatuses),
		source: literals(...entitlementSources),
		providerTransactionId: v.optional(v.string()),
		providerEventId: v.optional(v.string()),
		updatedAt: v.number(),
	})
		.index('by_applicationId', ['applicationId'])
		.index('by_ownerId', ['ownerId'])
		.index('by_providerEventId', ['providerEventId']),
})
