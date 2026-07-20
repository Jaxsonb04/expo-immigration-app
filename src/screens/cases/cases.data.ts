import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import type { CaseStatus } from '@convex/shared/applicationShapes'
import { useMutation, useQuery } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'

// M3-T2 data layer for the Cases tab, wiring the M3-T1 backend (convex/cases.ts).

export type CaseSummary = FunctionReturnType<typeof api.cases.listCases>[number]
export type CaseDetail = FunctionReturnType<typeof api.cases.getCase>
export type LinkableApplication = FunctionReturnType<
	typeof api.cases.listLinkableApplications
>[number]

/** Official USCIS case-status lookup — users enter their receipt number there. */
export const USCIS_CASE_STATUS_URL = 'https://egov.uscis.gov/'

export function useCases(): CaseSummary[] | undefined {
	return useQuery(api.cases.listCases, {})
}

export function useCase(caseId: Id<'cases'>): CaseDetail | undefined {
	return useQuery(api.cases.getCase, { caseId })
}

/** Applications the owner can link a case to: non-closed and not already
 * linked (server-filtered). Linking a draft marks it filed — the receipt is
 * proof the filing happened. */
export function useLinkableApplications(): LinkableApplication[] | undefined {
	return useQuery(api.cases.listLinkableApplications, {})
}

export function useCreateCase() {
	return useMutation(api.cases.createCase)
}

export function useAddStatusUpdate() {
	return useMutation(api.cases.addStatusUpdate)
}

/** Statuses that read as good news (success accent in the timeline). */
const POSITIVE_STATUSES: ReadonlySet<CaseStatus> = new Set([
	'approved',
	'cardBeingProduced',
	'cardMailed',
	'cardDelivered',
])

export type StatusTone = 'attention' | 'positive' | 'neutral'

/** The visual tone for a status: RFE needs attention; late-stage statuses are
 * positive; everything else is neutral. */
export function statusTone(status: CaseStatus): StatusTone {
	if (status === 'requestForEvidence') return 'attention'
	if (POSITIVE_STATUSES.has(status)) return 'positive'
	return 'neutral'
}

/** 'Aug 1, 2026' for a timeline entry's occurredAt (ms). */
export function formatCaseDate(occurredAt: number): string {
	return new Date(occurredAt).toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	})
}
