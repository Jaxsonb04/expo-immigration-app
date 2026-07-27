import { literals } from 'convex-helpers/validators'
import { v } from 'convex/values'
import { internal } from './_generated/api'
import { type ActionCtx, action, internalAction, internalMutation } from './_generated/server'
import { DELETION_TOMBSTONE_TTL_MS } from './shared/authSecurity'
import {
	OWNER_DELETION_PHASES,
	deleteOwnerDataBatch,
	reassignOwnerData,
	type OwnerDeletionBatchResult,
	type OwnerDeletionPhase,
} from './model/ownerData'

const ownerDeletionPhase = literals(...OWNER_DELETION_PHASES)

/**
 * Complete an owner purge as a sequence of separate mutation transactions.
 * The caller awaits every batch, so Better Auth never deletes the identity
 * until all app data and storage blobs are gone.
 */
export async function purgeOwnerDataInBatches(
	ctx: Pick<ActionCtx, 'runMutation'>,
	ownerId: string,
): Promise<void> {
	await ctx.runMutation(internal.account.beginOwnerDeletion, { ownerId })
	let phase: OwnerDeletionPhase = OWNER_DELETION_PHASES[0]
	for (;;) {
		const result: OwnerDeletionBatchResult = await ctx.runMutation(
			internal.account.purgeOwnerDataBatch,
			{ ownerId, phase },
		)
		if (result.done) return
		phase = result.nextPhase
	}
}

/**
 * Delete every app-owned row and stored file for the calling account.
 *
 * This public action remains for anonymous deletion and focused cascade tests.
 * Current clients use Better Auth's delete-user endpoint, whose `beforeDelete`
 * hook invokes `purgeOwnerData` below before deleting the auth identity.
 */
export const deleteAccountData = action({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity()
		if (identity === null) throw new Error('Not authenticated')
		await purgeOwnerDataInBatches(ctx, identity.tokenIdentifier)
		return null
	},
})

/**
 * Data carryover for Better Auth anonymous account linking (M6-T3). Called
 * only from the server-side `onLinkAccount` hook in convex/auth.ts — never
 * from a client — with owner ids the hook derives from the two Better Auth
 * user records. Moves the anonymous session's applications, answers,
 * documents, cases, and usage to the permanent account (merge rules in
 * `reassignOwnerData`).
 */
export const reassignAccountData = internalMutation({
	args: { fromOwnerId: v.string(), toOwnerId: v.string() },
	handler: async (ctx, args) => {
		await reassignOwnerData(ctx, args.fromOwnerId, args.toOwnerId)
		return null
	},
})

/** Install the write gate before the first deletion transaction. */
export const beginOwnerDeletion = internalMutation({
	args: { ownerId: v.string() },
	handler: async (ctx, args): Promise<null> => {
		const now = Date.now()
		const expiresAt = now + DELETION_TOMBSTONE_TTL_MS
		const existing = await ctx.db
			.query('accountDeletionTombstones')
			.withIndex('by_ownerId', (q) => q.eq('ownerId', args.ownerId))
			.unique()
		if (existing === null) {
			await ctx.db.insert('accountDeletionTombstones', {
				ownerId: args.ownerId,
				createdAt: now,
				expiresAt,
			})
		} else {
			await ctx.db.patch('accountDeletionTombstones', existing._id, {
				expiresAt: Math.max(existing.expiresAt, expiresAt),
			})
		}
		await ctx.scheduler.runAfter(
			DELETION_TOMBSTONE_TTL_MS,
			internal.account.clearOwnerDeletionTombstone,
			{ ownerId: args.ownerId },
		)
		return null
	},
})

/** Remove only an expired write gate; an older scheduled run cannot clear a
 * gate extended by a later retry. */
export const clearOwnerDeletionTombstone = internalMutation({
	args: { ownerId: v.string() },
	handler: async (ctx, args): Promise<null> => {
		const existing = await ctx.db
			.query('accountDeletionTombstones')
			.withIndex('by_ownerId', (q) => q.eq('ownerId', args.ownerId))
			.unique()
		if (existing === null) return null
		const remainingMs = existing.expiresAt - Date.now()
		if (remainingMs > 0) {
			await ctx.scheduler.runAfter(remainingMs, internal.account.clearOwnerDeletionTombstone, args)
			return null
		}
		await ctx.db.delete('accountDeletionTombstones', existing._id)
		return null
	},
})

/**
 * One bounded deletion transaction. The action orchestrator invokes this
 * repeatedly; clients and crons never call it directly.
 */
export const purgeOwnerDataBatch = internalMutation({
	args: { ownerId: v.string(), phase: ownerDeletionPhase },
	handler: async (ctx, args) => {
		return await deleteOwnerDataBatch(ctx, args.ownerId, args.phase)
	},
})

/** Full internal cascade for temp-account cleanup and focused tests. */
export const purgeOwnerData = internalAction({
	args: { ownerId: v.string() },
	handler: async (ctx, args) => {
		await purgeOwnerDataInBatches(ctx, args.ownerId)
		return null
	},
})
