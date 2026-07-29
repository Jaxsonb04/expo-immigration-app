import releasePolicy from '../../release-policy.json'

/**
 * Server-side enforcement of the first-release feature boundary.
 *
 * The client hides a disabled feature's tab and default-denies its deep links
 * (`src/lib/release-policy.ts`), but a hidden screen is not an authorization
 * boundary: every Convex `query`/`mutation`/`action` is a public internet
 * endpoint, reachable by anyone holding a session token — and an anonymous
 * token is free to mint. Without this gate, "disabled" means "not in the UI",
 * not "not in the product".
 *
 * Reads the same machine-readable `release-policy.json` the client and the
 * social-provider gate read, so re-enabling a feature stays a single reviewed
 * source change rather than a remote switch.
 */
type ReleaseFeature = keyof typeof releasePolicy

const FEATURE_LABELS: Record<ReleaseFeature, string> = {
	filingPreparation: 'Filing preparation',
	assistant: 'The assistant',
	community: 'Community',
	socialLogin: 'Social sign-in',
	passwordRecovery: 'Password recovery',
}

/**
 * Throw unless `feature` ships in this release. Call as the FIRST statement of
 * a handler, before any identity lookup or database read, so a disabled
 * endpoint never touches user data on its way to rejecting the call.
 */
export function assertFeatureEnabled(feature: ReleaseFeature): void {
	if (!releasePolicy[feature]) {
		throw new Error(`${FEATURE_LABELS[feature]} is not available in this release`)
	}
}
