import { useEffect, useState } from 'react'

/** A first load slower than this is worth explaining rather than spinning at. */
const SLOW_LOAD_MS = 6000

/**
 * True while `isLoading` is true and this screen has already waited
 * {@link SLOW_LOAD_MS} for it at least once.
 *
 * A Convex `useQuery` returns `undefined` both while it is loading and while
 * the device simply cannot reach the backend — it never surfaces an error for
 * a dropped connection. Without this, an offline cold start sits on a spinner
 * forever with nothing to read and nothing to tap, which is the single most
 * common "app is broken" impression and a Guideline 2.1 rejection risk.
 *
 * Once a load has been slow, later loads on the same screen show the hint
 * immediately: a connection that has already stalled once is exactly the one
 * worth warning about, and it keeps this hook free of the ref reads and
 * in-effect `setState` calls the React Compiler lint rules reject.
 */
export function useSlowLoad(isLoading: boolean, delayMs: number = SLOW_LOAD_MS): boolean {
	const [hasBeenSlow, setHasBeenSlow] = useState(false)

	useEffect(() => {
		if (!isLoading) return
		const timer = setTimeout(() => setHasBeenSlow(true), delayMs)
		return () => clearTimeout(timer)
	}, [isLoading, delayMs])

	return isLoading && hasBeenSlow
}
