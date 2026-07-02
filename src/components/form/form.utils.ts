/**
 * Convert TanStack field errors into a single display message. Errors are
 * `string[]` for function validators or StandardSchema issue objects (with a
 * `.message`) for Zod — this handles both shapes.
 */
export function fieldErrorText(errors: readonly unknown[]): string | undefined {
	for (const err of errors) {
		if (typeof err === 'string' && err.length > 0) {
			return err
		}
		if (err !== null && typeof err === 'object' && 'message' in err) {
			const message = (err as { message?: unknown }).message
			if (typeof message === 'string' && message.length > 0) {
				return message
			}
		}
	}
	return undefined
}
