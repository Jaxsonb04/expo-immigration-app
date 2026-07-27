type AuthEnvironment = Record<string, string | undefined>

export type AuthEmailWebhookConfig = Readonly<{
	url: string
	token: string
	from: string
}>

type FetchLike = (
	input: string,
	init: RequestInit,
) => Promise<{
	ok: boolean
	status: number
}>

const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/
const NAMED_EMAIL_PATTERN = /^[^<>\r\n]+<[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+>$/

/**
 * Password recovery is disabled unless every webhook setting is present.
 * Partial configuration fails closed so a deployment cannot appear to send
 * recovery mail while silently dropping it.
 */
export function authEmailWebhookConfig(env: AuthEnvironment): AuthEmailWebhookConfig | null {
	const url = env.AUTH_EMAIL_WEBHOOK_URL?.trim()
	const token = env.AUTH_EMAIL_WEBHOOK_TOKEN?.trim()
	const from = env.AUTH_EMAIL_FROM?.trim()

	if (!url && !token && !from) return null
	if (!url || !token || !from) {
		throw new Error(
			'AUTH_EMAIL_WEBHOOK_URL, AUTH_EMAIL_WEBHOOK_TOKEN, and AUTH_EMAIL_FROM must all be set',
		)
	}

	let parsed: URL
	try {
		parsed = new URL(url)
	} catch {
		throw new Error('AUTH_EMAIL_WEBHOOK_URL must be a valid HTTPS URL')
	}
	if (
		parsed.protocol !== 'https:' ||
		parsed.hostname === 'localhost' ||
		parsed.hostname === '127.0.0.1'
	) {
		throw new Error('AUTH_EMAIL_WEBHOOK_URL must be a public HTTPS URL')
	}
	if (!EMAIL_PATTERN.test(from) && !NAMED_EMAIL_PATTERN.test(from)) {
		throw new Error('AUTH_EMAIL_FROM must be a valid email address')
	}

	return Object.freeze({ url: parsed.href, token, from })
}

/**
 * Provider-neutral transactional-email boundary.
 *
 * The configured endpoint receives no saved case data: only the destination
 * email address and a one-hour Better Auth reset URL. It must return any 2xx
 * response after accepting the message.
 */
export async function sendPasswordResetEmail(
	config: AuthEmailWebhookConfig,
	message: { to: string; resetUrl: string },
	fetchImpl: FetchLike = fetch,
): Promise<void> {
	const response = await fetchImpl(config.url, {
		method: 'POST',
		headers: {
			authorization: `Bearer ${config.token}`,
			'content-type': 'application/json',
		},
		body: JSON.stringify({
			kind: 'password_reset',
			to: message.to,
			from: config.from,
			subject: 'Reset your Immifile password',
			text: [
				'Use this secure link to reset your Immifile password:',
				message.resetUrl,
				'',
				'This link expires in one hour. If you did not request it, you can ignore this message.',
			].join('\n'),
		}),
	})

	if (!response.ok) {
		throw new Error(`Authentication email provider rejected the request (${response.status})`)
	}
}
