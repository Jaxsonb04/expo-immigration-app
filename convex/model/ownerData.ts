import type { MutationCtx } from '../_generated/server'

// The account-deletion contract (REARCHITECTURE.md): removing an owner wipes
// every app-owned row AND every stored file. No financial records survive in
// Convex. The walkthrough seed's reset path reuses this same cascade so the
// two can never drift apart.

const DELETE_BATCH = 100

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
}
