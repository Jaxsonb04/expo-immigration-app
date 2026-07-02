import { api } from '@convex/_generated/api'
import { useQuery } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'

export type Vault = FunctionReturnType<typeof api.home.getVault>
export type VaultDocument = Vault['documents'][number]
export type NeededSlot = Vault['neededSlots'][number]

export function useVault(): Vault | undefined {
	return useQuery(api.home.getVault, {})
}
