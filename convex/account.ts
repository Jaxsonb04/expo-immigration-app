import { mutation } from './_generated/server'
import { requireOwnerId } from './lib/auth'
import { deleteOwnerData } from './model/ownerData'

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
