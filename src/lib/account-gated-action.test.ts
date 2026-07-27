import { describe, expect, test, vi } from 'vitest'
import { runAccountGatedAction } from './account-gated-action'

const recap = {
	title: 'Create an account before uploading',
	description: 'Keep sensitive documents in a recoverable account.',
}

describe('runAccountGatedAction', () => {
	test('parks the action when account conversion is dismissed', async () => {
		const requireAccount = vi.fn().mockResolvedValue(false)
		const action = vi.fn()

		await expect(runAccountGatedAction(requireAccount, recap, action)).resolves.toEqual({
			status: 'cancelled',
		})
		expect(requireAccount).toHaveBeenCalledWith(recap)
		expect(action).not.toHaveBeenCalled()
	})

	test('does not run the action before account conversion completes', async () => {
		let finishConversion!: (converted: boolean) => void
		const requireAccount = vi.fn(
			() =>
				new Promise<boolean>((resolve) => {
					finishConversion = resolve
				}),
		)
		const action = vi.fn().mockResolvedValue('uploaded')

		const pending = runAccountGatedAction(requireAccount, recap, action)
		await Promise.resolve()
		expect(action).not.toHaveBeenCalled()

		finishConversion(true)
		await expect(pending).resolves.toEqual({ status: 'completed', value: 'uploaded' })
		expect(action).toHaveBeenCalledOnce()
	})

	test('propagates action failures to the caller error boundary', async () => {
		const requireAccount = vi.fn().mockResolvedValue(true)
		const action = vi.fn().mockRejectedValue(new Error('upload failed'))

		await expect(runAccountGatedAction(requireAccount, recap, action)).rejects.toThrow(
			'upload failed',
		)
	})
})
