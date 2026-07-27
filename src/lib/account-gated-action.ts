export type AccountGateRecap = {
	title?: string
	description?: string
	highlights?: string[]
}

type RequireAccount = (recap?: AccountGateRecap) => Promise<boolean>

export type AccountGatedActionResult<T> =
	{ status: 'cancelled' } | { status: 'completed'; value: T }

/**
 * Runs a sensitive action only after the shared account gate resolves true.
 * Keeping the action behind the awaited boundary ensures a dismissed or still-
 * pending conversion cannot open a file picker, upload bytes, or write PII.
 */
export async function runAccountGatedAction<T>(
	requireAccount: RequireAccount,
	recap: AccountGateRecap,
	action: () => Promise<T>,
): Promise<AccountGatedActionResult<T>> {
	if (!(await requireAccount(recap))) return { status: 'cancelled' }
	return { status: 'completed', value: await action() }
}
