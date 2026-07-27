type AnonymousSignInResult = {
	data?: { user?: { id?: string } } | null
	error?: { message?: string } | null
}

type AnonymousSessionDependencies = {
	hasPersistedCookie: () => boolean
	resolveSession: (expectedUserId?: string) => Promise<boolean>
	signInAnonymously: () => Promise<AnonymousSignInResult>
}

export type AnonymousSessionResult =
	{ ok: true; createdUserId: string | null } | { ok: false; message: string }

/**
 * Establish one usable anonymous session without destructive retry behavior.
 *
 * A valid persisted session wins before any sign-in request, so pressing the
 * button again after a delayed auth handoff cannot mint another identity.
 */
export async function establishAnonymousSession({
	hasPersistedCookie,
	resolveSession,
	signInAnonymously,
}: AnonymousSessionDependencies): Promise<AnonymousSessionResult> {
	if (hasPersistedCookie() && (await resolveSession())) {
		return { ok: true, createdUserId: null }
	}

	const { data, error } = await signInAnonymously()
	const createdUserId = data?.user?.id
	if (createdUserId) {
		return (await resolveSession(createdUserId))
			? { ok: true, createdUserId }
			: { ok: false, message: 'Please try again in a moment.' }
	}

	if (await resolveSession()) {
		return { ok: true, createdUserId: null }
	}

	return {
		ok: false,
		message: error?.message ?? 'Please try again in a moment.',
	}
}
