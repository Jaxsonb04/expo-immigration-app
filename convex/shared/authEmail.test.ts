import { describe, expect, test, vi } from 'vitest'
import { authEmailWebhookConfig, sendPasswordResetEmail } from './authEmail'

const VALID_ENV = {
	AUTH_EMAIL_WEBHOOK_URL: 'https://mailer.example.com/immifile',
	AUTH_EMAIL_WEBHOOK_TOKEN: 'webhook-secret',
	AUTH_EMAIL_FROM: 'Immifile Support <support@immifile.app>',
}

describe('authentication email webhook', () => {
	test('stays disabled when no email settings are present', () => {
		expect(authEmailWebhookConfig({})).toBeNull()
	})

	test('fails closed for partial or unsafe configuration', () => {
		expect(() =>
			authEmailWebhookConfig({ AUTH_EMAIL_WEBHOOK_URL: VALID_ENV.AUTH_EMAIL_WEBHOOK_URL }),
		).toThrow(/must all be set/)
		expect(() =>
			authEmailWebhookConfig({
				...VALID_ENV,
				AUTH_EMAIL_WEBHOOK_URL: 'http://localhost:3000/email',
			}),
		).toThrow(/public HTTPS/)
		expect(() => authEmailWebhookConfig({ ...VALID_ENV, AUTH_EMAIL_FROM: 'not-an-email' })).toThrow(
			/valid email/,
		)
	})

	test('sends the minimal password-reset contract without case data', async () => {
		let callCount = 0
		let capturedUrl: string | undefined
		let capturedInit: RequestInit | undefined
		const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
			callCount += 1
			capturedUrl = url
			capturedInit = init
			return { ok: true, status: 202 }
		})
		const config = authEmailWebhookConfig(VALID_ENV)
		expect(config).not.toBeNull()

		await sendPasswordResetEmail(
			config!,
			{
				to: 'person@example.com',
				resetUrl: 'https://auth.immifile.app/api/auth/reset-password/token',
			},
			fetchMock,
		)

		expect(callCount).toBe(1)
		expect(capturedUrl).toBe('https://mailer.example.com/immifile')
		expect(capturedInit).toBeDefined()
		const init = capturedInit!
		expect(init.headers).toEqual({
			authorization: 'Bearer webhook-secret',
			'content-type': 'application/json',
		})
		expect(JSON.parse(init.body as string)).toEqual({
			kind: 'password_reset',
			to: 'person@example.com',
			from: 'Immifile Support <support@immifile.app>',
			subject: 'Reset your Immifile password',
			text: expect.stringContaining('This link expires in one hour.'),
		})
		expect(init.body).not.toContain('receipt')
		expect(init.body).not.toContain('case')
	})

	test('rejects non-success provider responses without exposing a response body', async () => {
		const config = authEmailWebhookConfig(VALID_ENV)
		await expect(
			sendPasswordResetEmail(
				config!,
				{
					to: 'person@example.com',
					resetUrl: 'https://auth.immifile.app/reset',
				},
				async () => ({ ok: false, status: 503 }),
			),
		).rejects.toThrow('Authentication email provider rejected the request (503)')
	})
})
