# First App Store Release

## Shipping surface

- Cases: account-gated receipt-number storage, a manual status timeline, deletion, and a link to official USCIS Case Status Online.
- Resources: curated links to official USCIS and DOJ tools.
- Account: email/password sign-in, complete account deletion, privacy policy, terms, and support.

Filing preparation, interviews, application/document routes, the AI assistant, public community, Google login, camera, microphone, Face ID, widgets, and notification configuration are disabled for this release. Their data and implementation remain intact for a later reviewed release.

## Required production setup

Follow `docs/PRODUCTION_ACCESS_SETUP.md` for the exact account-role, secret,
mailbox, EAS, and Apple steps. It is written so no secret value needs to be
shared with Codex or committed to the repository.

1. Create EAS `production` environment values for:
   - `EXPO_PUBLIC_CONVEX_URL`
   - `EXPO_PUBLIC_CONVEX_SITE_URL`
   - `EXPO_PUBLIC_AUTH_SITE_URL`
   - `EXPO_PUBLIC_PRIVACY_URL`
   - `EXPO_PUBLIC_SUPPORT_URL`
   - `EXPO_PUBLIC_SUPPORT_EMAIL`
   - `EXPO_PUBLIC_PASSWORD_RECOVERY_ENABLED=true`
   - `IMMIFILE_PRODUCTION_BACKEND_CONFIRMED=true`
   - `IMMIFILE_AUTH_EMAIL_CONFIRMED=true`
   - `HEROUI_KEY` as a secret, using the trusted `hp_` API key
2. Deploy a production Convex backend. Set a production `BETTER_AUTH_SECRET`, confirm `DEV_SEED_ENABLED` is absent or false, and ensure the public auth proxy routes to that production deployment rather than a development deployment. Configure and test the three `AUTH_EMAIL_*` values described in `docs/AUTH_EMAIL_WEBHOOK.md`.
3. Publish `docs/PRIVACY_POLICY.md` at a stable public URL. Verify it while signed out, then enter that URL in App Store Connect.
4. Publish `docs/SUPPORT.md` at a stable public support-information URL with accurate contact information and a monitored private support channel. Verify it while signed out and enter it as the App Store support URL. The public GitHub issue tracker is supplemental and does not satisfy the private-support gate.
5. Update `SUPPORT_INFO_URL` in `src/screens/account/account.legal.tsx` if the published support URL differs from the repository document. Do not submit while that URL is unavailable or still says the private channel has not been published.
6. Provide an App Review demo email/password account. Keep the production backend online throughout review.
7. Confirm production auth has no legacy social-only accounts. Migrate or remove any such accounts, or implement a recent social reauthentication path for account deletion, before submission.
8. In App Store Connect, describe only the three shipping surfaces above. Screenshots and review notes must not advertise filing, AI, or community features.
9. Copy the reviewed product-page, review-note, and privacy-answer drafts from `docs/APP_STORE_METADATA.md`, replacing every `REQUIRED:` placeholder.

The repository includes `.github/workflows/public-pages.yml`, which builds the two public documents from `docs/` after they reach `main`. GitHub Pages must be enabled once with **Settings → Pages → Source: GitHub Actions** before the first deployment.

## App privacy answers to verify

The release stores account contact information, an internal user/session identifier, security metadata, and user-entered receipt numbers/status notes for app functionality. It has no ads or cross-app tracking. After account deletion, an opaque deletion-protection identifier may remain for up to one hour solely to reject requests made with a stale session; it contains no saved case content and is then removed. Confirm the final answers against the production Convex and Better Auth configuration before submission.

Temporary accounts become eligible for permanent deletion after 48 hours. Cleanup runs hourly, so deletion occurs in an hourly run after eligibility and may be delayed until a later retry if a cleanup fails. Store metadata, the public privacy policy, and review notes must describe that timing rather than promise deletion at the exact 48-hour instant.

## Verification

Run:

```sh
npm run release:config
npm run typecheck
npm run lint
npm run test:once
npx expo export --platform ios
```

Then test a production-profile build on physical iPhone and iPad hardware. Exercise first launch, email sign-up, add/update/delete case, every official resource link, account deletion, stale-session write rejection, temporary-account cleanup after eligibility, offline/error states, Dynamic Type, VoiceOver labels, and disabled-route deep links.

Open the published privacy and support URLs in a signed-out browser. Confirm that neither requires a developer account, both match the in-app disclosures, and the support page contains the monitored private contact that will be available throughout review.

With the EAS production variables loaded locally, run `npm run release:remote-check`. It verifies the authentication discovery document and keys, the public session endpoint, and the published privacy/support pages without creating or modifying production data.
