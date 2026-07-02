import { createContext, use, type ReactNode } from 'react'
import type { Vault } from './documents.data'

const VaultContext = createContext<Vault | null>(null)

export function VaultProvider(props: { vault: Vault; children: ReactNode }) {
	return <VaultContext value={props.vault}>{props.children}</VaultContext>
}

export function useVaultContext(): Vault {
	const vault = use(VaultContext)
	if (vault === null) {
		throw new Error('Documents components must be rendered inside <VaultProvider>')
	}
	return vault
}
