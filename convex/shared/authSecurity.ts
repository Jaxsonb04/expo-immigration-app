export const CONVEX_JWT_EXPIRATION_SECONDS = 15 * 60

// Keep the deletion write-gate well past every JWT issued before deletion.
// The tombstone contains only the opaque owner key and timestamps.
export const DELETION_TOMBSTONE_TTL_MS = 60 * 60 * 1000
