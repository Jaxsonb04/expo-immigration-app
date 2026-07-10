import { useSyncExternalStore } from 'react'

// Today's ISO date as an external store, quantized to the hour so the snapshot
// is referentially stable (render-purity-safe way to read the clock; the date
// itself only changes at midnight).
const HOUR_MS = 60 * 60 * 1000
const subscribeHourTick = (onTick: () => void): (() => void) => {
	const id = setInterval(onTick, HOUR_MS)
	return () => clearInterval(id)
}
const currentIsoDay = () => new Date().toISOString().slice(0, 10)

/** Today as YYYY-MM-DD (UTC), stable within the hour. */
export function useToday(): string {
	return useSyncExternalStore(subscribeHourTick, currentIsoDay, currentIsoDay)
}
