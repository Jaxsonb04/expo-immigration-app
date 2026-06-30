import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import {
	applicantProfileValidator,
	documentTypeValidator,
	relationshipValidator,
} from './lib/validators'
import {
	caseFormTypeValidator,
	caseHistoryEntryValidator,
	caseStatusValidator,
} from './model/cases'
import { filingFormTypeValidator } from './model/filings'

// The Better Auth component manages its own tables in an isolated component
// namespace, so no auth tables are needed here. Application tables below are
// scoped to an account holder via `ownerId` (the authenticated identity's
// tokenIdentifier — see convex/lib/auth.ts).
export default defineSchema({
	todos: defineTable({
		title: v.string(),
		description: v.string(),
		completed: v.boolean(),
	}),

	// An Applicant is the person whose benefit is renewed/replaced. One account
	// holder may own several applicants (self + dependents) — see ADR-0009.
	applicants: defineTable({
		ownerId: v.string(),
		displayName: v.string(),
		relationship: relationshipValidator,
		profile: v.optional(applicantProfileValidator),
	}).index('by_ownerId', ['ownerId']),

	// A Document is one stored item in an applicant's vault. Each upload of a
	// given type is a new version; the latest version is the "current" one
	// (see ADR-0007). `ownerId` is denormalised from the applicant for scoping.
	documents: defineTable({
		applicantId: v.id('applicants'),
		ownerId: v.string(),
		type: documentTypeValidator,
		version: v.number(),
		expiryDate: v.optional(v.string()),
		storageId: v.optional(v.id('_storage')),
	})
		.index('by_applicantId', ['applicantId'])
		.index('by_applicantId_and_type', ['applicantId', 'type'])
		.index('by_ownerId', ['ownerId']),

	// A Case is an in-progress USCIS matter — it exists only once a filing has
	// been received, and is tracked by its Receipt Number (CONTEXT.md, ADR-0008).
	// v1 is manual entry only: the user records the current status and we keep a
	// history timeline. `history` is bounded by the 7 canonical stages, so it is
	// safe to keep inline on the document.
	cases: defineTable({
		ownerId: v.string(),
		applicantId: v.optional(v.id('applicants')),
		formType: v.optional(caseFormTypeValidator),
		receiptNumber: v.string(),
		currentStatus: caseStatusValidator,
		history: v.array(caseHistoryEntryValidator),
	}).index('by_ownerId', ['ownerId']),

	// A Filing is an in-progress form Interview (ADR-0013). v1 keeps a single
	// I-765 (EAD renewal) draft per account holder: `draft` holds the wizard's
	// per-section answers, stored opaquely (`v.any()`) while the wizard shape is
	// still settling (issue #8 tracer), and `updatedAt` powers a "last saved"
	// hint. The one draft per (owner, formType) is fetched via
	// `by_ownerId_and_formType`; `by_ownerId` lists all of an owner's filings.
	filings: defineTable({
		ownerId: v.string(),
		formType: filingFormTypeValidator,
		draft: v.any(),
		updatedAt: v.number(),
	})
		.index('by_ownerId', ['ownerId'])
		.index('by_ownerId_and_formType', ['ownerId', 'formType']),
})
