import type { MutationCtx } from '../_generated/server'
import { targetKeyFor } from '../shared/community'

// The account-deletion contract (REARCHITECTURE.md): removing an owner wipes
// every app-owned row AND every stored file. No financial records survive in
// Convex. The walkthrough seed's reset path reuses this same cascade so the
// two can never drift apart.

const DELETE_BATCH = 100

/**
 * Delete every report pointing at a given target (all reporters). Used during
 * erasure so third-party reports whose free-text notes may describe the erased
 * owner's now-deleted content do not survive.
 */
async function deleteReportsForTarget(ctx: MutationCtx, targetKey: string): Promise<void> {
	for (;;) {
		const rows = await ctx.db
			.query('forumReports')
			.withIndex('by_targetKey', (q) => q.eq('targetKey', targetKey))
			.take(DELETE_BATCH)
		if (rows.length === 0) break
		for (const row of rows) await ctx.db.delete('forumReports', row._id)
	}
}

/**
 * Delete every app-owned row (and stored document files) for one owner.
 * Batched so a large vault stays within transaction read limits.
 */
export async function deleteOwnerData(ctx: MutationCtx, ownerId: string): Promise<void> {
	// Documents first, so their storage blobs are deleted alongside the rows.
	for (;;) {
		const docs = await ctx.db
			.query('documents')
			.withIndex('by_ownerId', (q) => q.eq('ownerId', ownerId))
			.take(DELETE_BATCH)
		if (docs.length === 0) break
		for (const doc of docs) {
			await ctx.storage.delete(doc.storageId)
			await ctx.db.delete('documents', doc._id)
		}
	}

	for (;;) {
		const rows = await ctx.db
			.query('applicationDocuments')
			.withIndex('by_ownerId_and_status', (q) => q.eq('ownerId', ownerId))
			.take(DELETE_BATCH)
		if (rows.length === 0) break
		for (const row of rows) await ctx.db.delete('applicationDocuments', row._id)
	}

	for (;;) {
		const rows = await ctx.db
			.query('applicationDrafts')
			.withIndex('by_ownerId', (q) => q.eq('ownerId', ownerId))
			.take(DELETE_BATCH)
		if (rows.length === 0) break
		for (const row of rows) await ctx.db.delete('applicationDrafts', row._id)
	}

	for (;;) {
		const rows = await ctx.db
			.query('entitlements')
			.withIndex('by_ownerId', (q) => q.eq('ownerId', ownerId))
			.take(DELETE_BATCH)
		if (rows.length === 0) break
		for (const row of rows) await ctx.db.delete('entitlements', row._id)
	}

	for (;;) {
		const rows = await ctx.db
			.query('cases')
			.withIndex('by_ownerId_and_receiptNumber', (q) => q.eq('ownerId', ownerId))
			.take(DELETE_BATCH)
		if (rows.length === 0) break
		for (const row of rows) await ctx.db.delete('cases', row._id)
	}

	for (;;) {
		const rows = await ctx.db
			.query('applications')
			.withIndex('by_ownerId_and_status', (q) => q.eq('ownerId', ownerId))
			.take(DELETE_BATCH)
		if (rows.length === 0) break
		for (const row of rows) await ctx.db.delete('applications', row._id)
	}

	for (;;) {
		const rows = await ctx.db
			.query('applicants')
			.withIndex('by_ownerId', (q) => q.eq('ownerId', ownerId))
			.take(DELETE_BATCH)
		if (rows.length === 0) break
		for (const row of rows) await ctx.db.delete('applicants', row._id)
	}

	// Assistant daily-usage counters (M1-T1): per-owner data, so it goes too.
	for (;;) {
		const rows = await ctx.db
			.query('assistantUsage')
			.withIndex('by_ownerId_and_day', (q) => q.eq('ownerId', ownerId))
			.take(DELETE_BATCH)
		if (rows.length === 0) break
		for (const row of rows) await ctx.db.delete('assistantUsage', row._id)
	}

	// Community forum (M4-T1). Erasure hard-deletes the owner's own reports,
	// comments, posts, and profile — no tombstone that would let pseudonymous
	// content survive — AND every third-party report that points at the owner's
	// deleted content (its free-text note may describe the erased user). Other
	// owners' comments on a deleted post are NOT touched (that is their data);
	// listComments makes them unreachable once the parent is gone.

	// Reports the owner FILED.
	for (;;) {
		const rows = await ctx.db
			.query('forumReports')
			.withIndex('by_reporter_and_targetKey', (q) => q.eq('reporterOwnerId', ownerId))
			.take(DELETE_BATCH)
		if (rows.length === 0) break
		for (const row of rows) await ctx.db.delete('forumReports', row._id)
	}

	// Owner's comments. Deleting a comment that still counts (parent not
	// `removed`) decrements its foreign parent's commentCount (floored at 0) so
	// an erased owner leaves no footprint in a public number; own posts are
	// skipped (deleted next anyway). Reports AGAINST each comment go too.
	for (;;) {
		const rows = await ctx.db
			.query('forumComments')
			.withIndex('by_author', (q) => q.eq('authorOwnerId', ownerId))
			.take(DELETE_BATCH)
		if (rows.length === 0) break
		for (const row of rows) {
			if (row.moderationStatus === 'visible') {
				const post = await ctx.db.get('forumPosts', row.postId)
				if (post !== null && post.moderationStatus !== 'removed' && post.authorOwnerId !== ownerId) {
					await ctx.db.patch('forumPosts', post._id, {
						commentCount: Math.max(0, post.commentCount - 1),
						updatedAt: Date.now(),
					})
				}
			}
			await deleteReportsForTarget(ctx, targetKeyFor('comment', row._id))
			await ctx.db.delete('forumComments', row._id)
		}
	}

	// Owner's posts, plus every report AGAINST each post.
	for (;;) {
		const rows = await ctx.db
			.query('forumPosts')
			.withIndex('by_author', (q) => q.eq('authorOwnerId', ownerId))
			.take(DELETE_BATCH)
		if (rows.length === 0) break
		for (const row of rows) {
			await deleteReportsForTarget(ctx, targetKeyFor('post', row._id))
			await ctx.db.delete('forumPosts', row._id)
		}
	}

	// Blocks the owner CREATED (they are the blocker).
	for (;;) {
		const rows = await ctx.db
			.query('communityBlocks')
			.withIndex('by_blocker', (q) => q.eq('blockerOwnerId', ownerId))
			.take(DELETE_BATCH)
		if (rows.length === 0) break
		for (const row of rows) await ctx.db.delete('communityBlocks', row._id)
	}

	// The owner's profile(s), plus every OTHER viewer's block pointing AT that
	// profile (a dangling block row would otherwise pin the erased pseudonym's
	// handle forever). Must run while the profile rows still exist.
	for (;;) {
		const rows = await ctx.db
			.query('communityProfiles')
			.withIndex('by_ownerId', (q) => q.eq('ownerId', ownerId))
			.take(DELETE_BATCH)
		if (rows.length === 0) break
		for (const row of rows) {
			for (;;) {
				const blocks = await ctx.db
					.query('communityBlocks')
					.withIndex('by_blockedProfile', (q) => q.eq('blockedProfileId', row._id))
					.take(DELETE_BATCH)
				if (blocks.length === 0) break
				for (const block of blocks) await ctx.db.delete('communityBlocks', block._id)
			}
			await ctx.db.delete('communityProfiles', row._id)
		}
	}
	// NOTE: reportCount on FOREIGN targets the erased owner reported is a
	// non-personal aggregate and may drift down by the deleted reports; the
	// M4-T3 moderation view recomputes it from forumReports.by_targetKey.
}
