import { v } from 'convex/values'
import { zodToConvex } from 'convex-helpers/server/zod4'
import { literals } from 'convex-helpers/validators'
import { mutation, query } from './_generated/server'
import { requireOwnerId } from './lib/auth'
import { isEntitledToCleanExport } from './model/entitlements'
import {
	computeProgress,
	getDraftForApplication,
	getOwnedApplication,
	reconcileRequirements,
} from './model/applications'
import {
	applicationKinds,
	formTypes,
	i765DraftAnswersShape,
	i90CardStatuses,
	i90DraftAnswersShape,
	isSupportedSituation,
	type PersonFacts,
} from './shared/applicationShapes'
import { screenI90 } from './shared/screening'
import { interviewStepKeys, preReviewStepKeys } from './shared/interviewSteps'
import { isStepComplete, stepOwnedKeys } from './shared/interviewValidation'
import { computeReadiness } from './shared/readiness'

const draftShapeFor = { i765: i765DraftAnswersShape, i90: i90DraftAnswersShape } as const

function definedEntries<T extends Record<string, unknown>>(value: T): Partial<T> {
	return Object.fromEntries(Object.entries(value).filter(([, x]) => x !== undefined)) as Partial<T>
}

/**
 * Create an application for one of the five supported situations. Seeds the
 * draft's person-facts from the applicant profile (autofill, ADR-0014) and
 * materializes the requirement slots.
 *
 * Eligibility screening (shared/screening.ts) is enforced HERE, at the single
 * server choke point every start flow uses (new-application modal and the
 * assistant deep link both call this mutation), so no client can create an
 * application for a situation the app cannot honestly support.
 */
export const createApplication = mutation({
	args: {
		applicantId: v.id('applicants'),
		formType: literals(...formTypes),
		applicationKind: literals(...applicationKinds),
		// Required for I-90: drives conditional-resident screening and the
		// Part 2 Item 1 status boxes on the printed form.
		i90CardStatus: v.optional(literals(...i90CardStatuses)),
	},
	handler: async (ctx, args) => {
		const ownerId = await requireOwnerId(ctx)
		if (!isSupportedSituation(args.formType, args.applicationKind)) {
			throw new Error('This form and situation combination is not supported')
		}
		if (args.formType === 'i90') {
			if (args.i90CardStatus === undefined) {
				throw new Error('Tell us what kind of card you have before starting')
			}
			const screening = screenI90(args.i90CardStatus, args.applicationKind)
			if (!screening.supported) {
				throw new Error(`${screening.title}. ${screening.explanation}`)
			}
		}
		const applicant = await ctx.db.get('applicants', args.applicantId)
		if (applicant === null || applicant.ownerId !== ownerId) {
			throw new Error('Applicant not found')
		}

		const now = Date.now()
		const stepKeys = interviewStepKeys[args.formType]
		const applicationId = await ctx.db.insert('applications', {
			ownerId,
			applicantId: args.applicantId,
			formType: args.formType,
			applicationKind: args.applicationKind,
			status: 'draft',
			currentStepKey: stepKeys[0],
			completedStepCount: 0,
			totalStepCount: stepKeys.length,
			updatedAt: now,
		})

		// Autofill: the profile is the only conduit between applications.
		const seededPersonFacts = definedEntries(applicant.profile)
		if (args.formType === 'i765') {
			await ctx.db.insert('applicationDrafts', {
				ownerId,
				applicationId,
				formType: 'i765',
				answers: { personFacts: seededPersonFacts, form: {} },
				stepCompletion: {},
				updatedAt: now,
			})
		} else {
			await ctx.db.insert('applicationDrafts', {
				ownerId,
				applicationId,
				formType: 'i90',
				// The screened card status is a real draft answer from day one; the
				// card-details step re-shows it for confirmation and edit.
				answers: { personFacts: seededPersonFacts, form: { cardStatus: args.i90CardStatus } },
				stepCompletion: {},
				updatedAt: now,
			})
		}

		const application = await ctx.db.get('applications', applicationId)
		await reconcileRequirements(ctx, application!)
		return applicationId
	},
})

export const listApplications = query({
	args: {},
	handler: async (ctx) => {
		const ownerId = await requireOwnerId(ctx)
		const applications = await ctx.db
			.query('applications')
			.withIndex('by_ownerId_and_status', (q) => q.eq('ownerId', ownerId))
			.take(100)
		const applicantNames = new Map<string, string>()
		for (const application of applications) {
			if (!applicantNames.has(application.applicantId)) {
				const applicant = await ctx.db.get('applicants', application.applicantId)
				applicantNames.set(application.applicantId, applicant?.displayName ?? 'Unknown')
			}
		}
		return applications
			.map((application) => ({
				...application,
				applicantName: applicantNames.get(application.applicantId) ?? 'Unknown',
			}))
			.sort((a, b) => b.updatedAt - a.updatedAt)
	},
})

/**
 * The Journey Hub payload: application + applicant + draft + slots +
 * entitlement + case. Not-found and not-owned both return null rather than
 * throwing: a deleteApplication commit re-runs any still-mounted live
 * subscription BEFORE the screen unmounts, and that re-run must render a
 * graceful fallback, not crash. Null leaks nothing an error didn't.
 */
export const getApplication = query({
	args: { applicationId: v.id('applications') },
	handler: async (ctx, args) => {
		const ownerId = await requireOwnerId(ctx)
		const application = await ctx.db.get('applications', args.applicationId)
		if (application === null || application.ownerId !== ownerId) return null
		const [applicant, draft, requirements, entitlement, linkedCase, applicantDocs] =
			await Promise.all([
				ctx.db.get('applicants', application.applicantId),
				getDraftForApplication(ctx, application._id),
				ctx.db
					.query('applicationDocuments')
					.withIndex('by_applicationId', (q) => q.eq('applicationId', application._id))
					.take(50),
				ctx.db
					.query('entitlements')
					.withIndex('by_applicationId', (q) => q.eq('applicationId', application._id))
					.take(10),
				ctx.db
					.query('cases')
					.withIndex('by_applicationId', (q) => q.eq('applicationId', application._id))
					.first(),
				// The applicant's Vault documents, so the UI can resolve an attached
				// slot's document and offer the reuse picker (M2-T3) without a second
				// round-trip.
				ctx.db
					.query('documents')
					.withIndex('by_applicantId', (q) => q.eq('applicantId', application.applicantId))
					.take(100),
			])
		return {
			application,
			applicant,
			draft,
			requirements,
			// Server-authoritative export gate: derived from the persisted draft and
			// slots here, never from client state, so "ready"/clean-export claims
			// cannot outrun the data (workflow-repair safety slice).
			readiness: computeReadiness({
				formType: application.formType,
				applicationKind: application.applicationKind,
				answers: draft.answers,
				requirements,
			}),
			isUnlocked: isEntitledToCleanExport(entitlement.some((e) => e.status === 'active')),
			case: linkedCase,
			// Only current (non-superseded) documents are reusable.
			applicantDocuments: applicantDocs
				.filter((doc) => doc.supersededById === undefined)
				.map((doc) => ({
					_id: doc._id,
					type: doc.type,
					label: doc.label,
					expiryDate: doc.expiryDate,
					updatedAt: doc.updatedAt,
				}))
				.sort((a, b) => b.updatedAt - a.updatedAt),
		}
	},
})

const stepDataValidator = v.union(
	zodToConvex(i765DraftAnswersShape.partial()),
	zodToConvex(i90DraftAnswersShape.partial()),
)

/**
 * The Next-save (REARCHITECTURE.md "Save Semantics"): validate, merge the
 * step's answers into the draft, mark the step complete, patch the progress
 * summary on the application, reconcile slots, and return the next step.
 * Idempotent per (applicationId, stepKey) — repeated taps and offline replays
 * converge on the same state.
 */
export const saveApplicationStep = mutation({
	args: {
		applicationId: v.id('applications'),
		stepKey: v.string(),
		stepData: stepDataValidator,
	},
	handler: async (ctx, args) => {
		const ownerId = await requireOwnerId(ctx)
		const application = await getOwnedApplication(ctx, ownerId, args.applicationId)
		if (application.status !== 'draft') {
			throw new Error('Only draft applications can be edited')
		}
		// Only genuine pre-Review steps can be saved. This rejects REVIEW_STEP_KEY
		// (which is never a real answer step and, if ever accepted, could push the
		// completed-count to "done" with a real step still missing) and any
		// unknown key.
		const owned = stepOwnedKeys[args.stepKey]
		if (owned === undefined || !preReviewStepKeys(application.formType).includes(args.stepKey)) {
			throw new Error(`Unknown step "${args.stepKey}" for this application`)
		}

		const draft = await getDraftForApplication(ctx, application._id)
		// The saved step is authoritative for the keys it owns: clear them first,
		// then apply the incoming slice, so a field the user cleared (an omitted
		// optional) is actually removed rather than retaining its stale prior value
		// under a shallow merge.
		const mergedPersonFacts: Record<string, unknown> = { ...draft.answers.personFacts }
		const mergedForm: Record<string, unknown> = { ...draft.answers.form }
		for (const key of owned.personFacts) delete mergedPersonFacts[key]
		for (const key of owned.form) delete mergedForm[key]
		const merged = {
			personFacts: { ...mergedPersonFacts, ...(args.stepData.personFacts ?? {}) },
			form: { ...mergedForm, ...(args.stepData.form ?? {}) },
		}
		// Semantic validation against the single-source shape (strips unknown
		// keys, enforces formats the storage validator can't, e.g. A-Number).
		const parsed = draftShapeFor[application.formType].safeParse(merged)
		if (!parsed.success) {
			throw new Error(`Invalid answers: ${parsed.error.issues.map((i) => i.message).join('; ')}`)
		}

		const now = Date.now()
		// Mark the step complete only when its OWNED required fields are actually
		// present and valid in the persisted draft — server-enforced, not a
		// client-supplied boolean. A partial/forged save persists its data but
		// cannot flip the step (or unlock Review) until the data is real.
		const stepComplete = isStepComplete(
			application.formType,
			application.applicationKind,
			args.stepKey,
			parsed.data,
		)
		const stepCompletion = { ...draft.stepCompletion, [args.stepKey]: stepComplete }
		await ctx.db.patch('applicationDrafts', draft._id, {
			answers: parsed.data,
			stepCompletion,
			updatedAt: now,
		})

		const progress = computeProgress(application.formType, stepCompletion)
		await ctx.db.patch('applications', application._id, {
			currentStepKey: progress.currentStepKey,
			completedStepCount: progress.completedStepCount,
			totalStepCount: progress.totalStepCount,
			updatedAt: now,
		})

		await reconcileRequirements(ctx, application)

		// Promotion at Review-reach (ADR-0014): once every pre-Review step is
		// complete, copy the person-facts onto the applicant profile. Re-fires
		// on later saves; latest promotion wins.
		if (preReviewStepKeys(application.formType).every((key) => stepCompletion[key] === true)) {
			const applicant = await ctx.db.get('applicants', application.applicantId)
			if (applicant !== null) {
				const promoted: Partial<PersonFacts> = definedEntries(parsed.data.personFacts)
				await ctx.db.patch('applicants', applicant._id, {
					profile: { ...applicant.profile, ...promoted },
					updatedAt: now,
				})
			}
		}

		return {
			nextStepKey: progress.currentStepKey,
			completedStepCount: progress.completedStepCount,
			totalStepCount: progress.totalStepCount,
		}
	},
})

// ---------------------------------------------------------------------------
// Filed lifecycle (decision 6: status transitions are explicit user actions or
// case-link assisted — payment never flips status). The transitions below are
// the ONLY writers of applications.status besides createApplication and the
// receipt-number reconcile in convex/cases.ts.
// ---------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * The user-confirmed "I filed this with USCIS" transition: draft -> filed with
 * the user's filing date. Honesty gate: if the server-owned readiness contract
 * says the application isn't ready, the caller must explicitly acknowledge that
 * it filed an incomplete-in-app application (`acknowledgeNotReady`) — recording
 * the user's real-world filing is allowed, silently faking readiness is not.
 * Idempotent: re-confirming an already-filed application keeps the original
 * filing date.
 */
export const markFiled = mutation({
	args: {
		applicationId: v.id('applications'),
		filedAt: v.number(),
		acknowledgeNotReady: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const ownerId = await requireOwnerId(ctx)
		const application = await getOwnedApplication(ctx, ownerId, args.applicationId)
		if (application.status === 'filed') return
		if (application.status === 'closed') {
			throw new Error('This application is closed. Reopen it before marking it filed.')
		}

		const now = Date.now()
		if (!Number.isFinite(args.filedAt) || args.filedAt > now + DAY_MS) {
			throw new Error('The filing date can’t be in the future')
		}
		if (args.filedAt < application._creationTime - DAY_MS) {
			throw new Error('The filing date can’t be before this application was started')
		}

		const [draft, requirements] = await Promise.all([
			getDraftForApplication(ctx, application._id),
			ctx.db
				.query('applicationDocuments')
				.withIndex('by_applicationId', (q) => q.eq('applicationId', application._id))
				.take(50),
		])
		const readiness = computeReadiness({
			formType: application.formType,
			applicationKind: application.applicationKind,
			answers: draft.answers,
			requirements,
		})
		if (!readiness.isReadyToFile && args.acknowledgeNotReady !== true) {
			throw new Error(
				'This application isn’t complete in the app yet. Finish the remaining items, or confirm that you filed it anyway.',
			)
		}

		await ctx.db.patch('applications', application._id, {
			status: 'filed',
			filedAt: args.filedAt,
			updatedAt: now,
		})
	},
})

/**
 * Close an application so it stops appearing as active work: an abandoned
 * draft, or a filed application whose case has concluded. Closing never erases
 * the filing record — a filed application keeps its filedAt. Idempotent.
 */
export const closeApplication = mutation({
	args: { applicationId: v.id('applications') },
	handler: async (ctx, args) => {
		const ownerId = await requireOwnerId(ctx)
		const application = await getOwnedApplication(ctx, ownerId, args.applicationId)
		if (application.status === 'closed') return
		await ctx.db.patch('applications', application._id, {
			status: 'closed',
			closedAt: Date.now(),
			updatedAt: Date.now(),
		})
	},
})

/**
 * Reopen policy: a closed application returns to the state it was in before
 * closing (filed if it has a filing record, draft otherwise). A filed
 * application can be reopened to a draft — "I marked this filed by mistake" —
 * but only while no USCIS case is linked: once a real receipt number exists,
 * the filing happened, and corrections happen with USCIS, not by un-filing
 * here. Idempotent for drafts.
 */
export const reopenApplication = mutation({
	args: { applicationId: v.id('applications') },
	handler: async (ctx, args) => {
		const ownerId = await requireOwnerId(ctx)
		const application = await getOwnedApplication(ctx, ownerId, args.applicationId)
		const now = Date.now()
		if (application.status === 'draft') return
		if (application.status === 'closed') {
			await ctx.db.patch('applications', application._id, {
				status: application.filedAt !== undefined ? 'filed' : 'draft',
				closedAt: undefined,
				updatedAt: now,
			})
			return
		}
		// filed -> draft: only while no case links this filing to USCIS.
		const linkedCase = await ctx.db
			.query('cases')
			.withIndex('by_applicationId', (q) => q.eq('applicationId', application._id))
			.first()
		if (linkedCase !== null) {
			throw new Error(
				'This application has a tracked USCIS case, so it can’t go back to a draft. Corrections after filing happen with USCIS directly.',
			)
		}
		await ctx.db.patch('applications', application._id, {
			status: 'draft',
			filedAt: undefined,
			updatedAt: now,
		})
	},
})

/**
 * Permanently delete a draft or closed application and everything that exists
 * only because of it: its draft answers, its requirement slots, and its
 * entitlement rows. Vault documents are the applicant's, not the
 * application's, and are never touched. A linked case (possible for a closed
 * application) is kept — it's a real receipt — but unlinked. Filed
 * applications can't be deleted: they're the filing record. Reopen first if it
 * was marked filed by mistake.
 */
export const deleteApplication = mutation({
	args: { applicationId: v.id('applications') },
	handler: async (ctx, args) => {
		const ownerId = await requireOwnerId(ctx)
		const application = await getOwnedApplication(ctx, ownerId, args.applicationId)
		if (application.status === 'filed') {
			throw new Error(
				'A filed application is your filing record and can’t be deleted. Close it instead — or reopen it first if it was marked filed by mistake.',
			)
		}

		const [draft, slots, entitlements, linkedCases] = await Promise.all([
			ctx.db
				.query('applicationDrafts')
				.withIndex('by_applicationId', (q) => q.eq('applicationId', application._id))
				.unique(),
			ctx.db
				.query('applicationDocuments')
				.withIndex('by_applicationId', (q) => q.eq('applicationId', application._id))
				.take(50),
			ctx.db
				.query('entitlements')
				.withIndex('by_applicationId', (q) => q.eq('applicationId', application._id))
				.take(10),
			ctx.db
				.query('cases')
				.withIndex('by_applicationId', (q) => q.eq('applicationId', application._id))
				.take(10),
		])
		if (draft !== null) await ctx.db.delete('applicationDrafts', draft._id)
		for (const slot of slots) await ctx.db.delete('applicationDocuments', slot._id)
		for (const entitlement of entitlements) await ctx.db.delete('entitlements', entitlement._id)
		for (const linkedCase of linkedCases) {
			await ctx.db.patch('cases', linkedCase._id, {
				applicationId: undefined,
				updatedAt: Date.now(),
			})
		}
		await ctx.db.delete('applications', application._id)
	},
})
