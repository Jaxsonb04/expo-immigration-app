import { v } from 'convex/values'
import { internalMutation, mutation } from './_generated/server'
import { requireOwnerId } from './lib/auth'
import { deleteOwnerData, reassignOwnerData } from './model/ownerData'

/**
 * Delete every app-owned row and stored file for the calling account.
 *
 * Scope note: this is the app-data half of the account-deletion contract.
 * Deleting the Better Auth user itself and the RevenueCat customer
 * deletion/anonymization call land with the PII/IAP phases; both must chain
 * through this cascade so no financial records survive in Convex.
 */
export const deleteAccountData = mutation({
	args: {},
	handler: async (ctx) => {
		const ownerId = await requireOwnerId(ctx)
		await deleteOwnerData(ctx, ownerId)
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

/**
 * Cascade for the temp-account cleanup cron (M6-T4): same erasure as
 * `deleteAccountData`, but for an owner id supplied by the internal caller
 * (the cron has no session for the account it is deleting).
 */
export const purgeOwnerData = internalMutation({
	args: { ownerId: v.string() },
	handler: async (ctx, args) => {
		await deleteOwnerData(ctx, args.ownerId)
		return null
	},
})
