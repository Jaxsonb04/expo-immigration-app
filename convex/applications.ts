import { v } from 'convex/values'
import { zodToConvex } from 'convex-helpers/server/zod4'
import { literals } from 'convex-helpers/validators'
import { mutation, query } from './_generated/server'
import { requireOwnerId } from './lib/auth'
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
	i90DraftAnswersShape,
	isSupportedSituation,
	type PersonFacts,
} from './shared/applicationShapes'
import { interviewStepKeys, preReviewStepKeys } from './shared/interviewSteps'

const draftShapeFor = { i765: i765DraftAnswersShape, i90: i90DraftAnswersShape } as const

function definedEntries<T extends Record<string, unknown>>(value: T): Partial<T> {
	return Object.fromEntries(Object.entries(value).filter(([, x]) => x !== undefined)) as Partial<T>
}

/**
 * Create an application for one of the five supported situations. Seeds the
 * draft's person-facts from the applicant profile (autofill, ADR-0014) and
 * materializes the requirement slots.
 */
export const createApplication = mutation({
	args: {
		applicantId: v.id('applicants'),
		formType: literals(...formTypes),
		applicationKind: literals(...applicationKinds),
	},
	handler: async (ctx, args) => {
		const ownerId = await requireOwnerId(ctx)
		if (!isSupportedSituation(args.formType, args.applicationKind)) {
			throw new Error('This form and situation combination is not supported')
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
		const seededAnswers = { personFacts: definedEntries(applicant.profile), form: {} }
		if (args.formType === 'i765') {
			await ctx.db.insert('applicationDrafts', {
				ownerId,
				applicationId,
				formType: 'i765',
				answers: seededAnswers,
				stepCompletion: {},
				updatedAt: now,
			})
		} else {
			await ctx.db.insert('applicationDrafts', {
				ownerId,
				applicationId,
				formType: 'i90',
				answers: seededAnswers,
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

/** The Journey Hub payload: application + applicant + draft + slots + entitlement + case. */
export const getApplication = query({
	args: { applicationId: v.id('applications') },
	handler: async (ctx, args) => {
		const ownerId = await requireOwnerId(ctx)
		const application = await getOwnedApplication(ctx, ownerId, args.applicationId)
		const [applicant, draft, requirements, entitlement, linkedCase] = await Promise.all([
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
		])
		return {
			application,
			applicant,
			draft,
			requirements,
			isUnlocked: entitlement.some((e) => e.status === 'active'),
			case: linkedCase,
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
		const stepKeys = interviewStepKeys[application.formType]
		if (!stepKeys.includes(args.stepKey)) {
			throw new Error(`Unknown step "${args.stepKey}" for this application`)
		}

		const draft = await getDraftForApplication(ctx, application._id)
		const merged = {
			personFacts: { ...draft.answers.personFacts, ...(args.stepData.personFacts ?? {}) },
			form: { ...draft.answers.form, ...(args.stepData.form ?? {}) },
		}
		// Semantic validation against the single-source shape (strips unknown
		// keys, enforces formats the storage validator can't, e.g. A-Number).
		const parsed = draftShapeFor[application.formType].safeParse(merged)
		if (!parsed.success) {
			throw new Error(`Invalid answers: ${parsed.error.issues.map((i) => i.message).join('; ')}`)
		}

		const now = Date.now()
		const stepCompletion = { ...draft.stepCompletion, [args.stepKey]: true }
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
