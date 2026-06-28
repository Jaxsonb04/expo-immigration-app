# Stage 6 Handoff

Date: 2026-06-27
Branch: `codex/stage-6-handoff`
Base: `main` at `c19f9f4`

## Update 2026-06-28 — Email/password auth shipped (Phase 6 auth feature)

- **"Create your own account" (email/password) is live.** Better Auth `emailAndPassword` is enabled in `apps/server/src/auth.ts` (verification off until a transactional email provider lands; min length 8, kept in sync with `packages/shared/src/auth.ts`). `buildAuthOptions` is now exported + unit-tested.
- **Provider-aware sessions.** `BetterAuthSessionService.getSessionUser` derives the provider (`google` | `email` | `unknown`) from `auth.api.listUserAccounts`; `SessionUser.provider` widened accordingly. Verified live: a credential account reports `provider: "email"`.
- **`/v1/auth/status`** now also returns `emailPasswordEnabled` (typed by the new shared `AuthStatus`). PATCH `/v1/profile` now rejects an empty `displayName` so a blank write can't wipe an established profile.
- **Mobile:** real sign-in (`(auth)/index.tsx`) and sign-up (`(auth)/sign-up.tsx`) forms (HeroUI Native `TextField`/`Input`) with shared validation, submit/disabled/error + a11y-alert states; `auth-context.tsx` gained `signInWithEmail`/`signUpWithEmail`, `response.ok` guards, Google-error catch, and privacy-preserving (non-enumerating) error copy. The `auth-continue-button` "Preview locally" Maestro affordance is preserved. New shared module `packages/shared/src/auth.ts` (validators + `AuthStatus`/`AuthProvider`).
- **Deployed to Railway production** (`api`) via `railway up` from the Mac. Smoke test passed live: `POST /api/auth/sign-up/email` → 200 + `__Secure-better-auth.session_token`; `GET /v1/profile` → metadata-only profile, user-scoped, `provider: "email"`. A real device sign-up on the iPhone 16 Pro simulator created an account and landed on Home.
- **Verification:** 83 tests (shared/server/mobile) + workspace typecheck + mobile lint all green. Three reviewer passes (security/react/typescript) run and their real findings fixed.
- **Test accounts created in prod Postgres** during verification: `smoke+<ts>@example.com` (curl) and `simtest<ts>@example.com` (device). Safe to delete.
- **Still gated:** Google sign-in needs real `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` (redirect `https://api-production-0041.up.railway.app/api/auth/callback/google`). KMS/PII, file upload, USCIS submission, PDF, push, moderation remain gated as before.

## What Landed

- Stage 6 local feature loop foundation for the Expo mobile app.
- `DESIGN.md` visual direction applied in mobile tokens/global CSS: warm paper background, white cards, near-black text, blue accent, Fraunces headings, DM Sans body.
- Thin route files under `apps/mobile/src/app/(tabs)` now delegate to feature modules under `apps/mobile/src/features`.
- Shared client-safe DTOs were expanded under `packages/shared/src` for applications, cases, deadlines, documents, profile, loop snapshots, selectors, I-765 drafts, forum safety, and news source attribution.
- Local loop repository/data added for mock-only state. It includes an active I-765 draft, manual case status, deadlines, document metadata, profile summary, forum safety data, and news source/editorial data.
- Home hub, Profile/Vault metadata surface, I-765 wizard shell, manual Tracker, and Calendar surfaces are implemented with local data.
- Manual tracker receipt entry now validates USCIS-style receipt numbers, saves a local government-side case summary, and keeps the no-live-USCIS-sync disclaimer visible.
- Calendar now renders deadline-linked reminder plans with local acknowledge/snooze state. It does not claim push delivery; Railway cron + Expo push remain production contracts until auth and device tokens land.
- Shared reminder dispatch planning now selects due push reminders, skips non-push/future/sent/cancelled/already-ticketed/locally-acknowledged reminders, and batches reminder IDs at Expo's 100-message request limit without exposing push-token data.
- Forum safety shell now renders pseudonymous local categories, visible threads/posts, peer-support-only safety copy, reporting, and local author blocking.
- News source/editorial shell now renders official USCIS/Federal Register source cards, editorially reviewed local news items, source URLs, published dates, summaries, tags, and local read state.
- Server API now exposes a protected `/v1/loop/contract` boundary that fails closed without `PHASE6_PROTECTED_API_TOKEN`, rejects missing/invalid bearer tokens, and returns only a non-PII local-loop contract when authenticated. Railway production has the token configured.
- Account/profile auth foundation now mounts Better Auth at `/api/auth/*`, reports Google OAuth readiness at `/v1/auth/status`, stores Expo sessions via secure-store on mobile, and exposes a session-protected `/v1/profile` endpoint backed by Railway Postgres `applicant_profile` metadata.
- Calendar grid was fixed to render real month cells instead of fake overflow dates.
- Mobile screen wrapper now handles iOS safe areas for the dev-client/native tab layout.
- CocoaPods UTF-8 workaround is in the mobile iOS scripts.

## Important Gates

- No real PII storage is implemented.
- No file upload/storage is implemented.
- No USCIS submission wording or submission action is implemented.
- Tracker is manual-first; no live USCIS sync dependency.
- Reminder delivery is local UI state only; no push token registration, Railway cron worker, or Expo push send is implemented.
- Reminder dispatch planning is pure shared logic only; it does not call Expo, store push tokens, fetch receipts, or run as a Railway cron job yet.
- Forum is local and pseudonymous only; no production auth identity, backend moderation queue, abuse-block sync, or legal-advice escalation workflow is implemented.
- News is local and editorially gated only; no Railway cron ingestion, scraping, summarization worker, or auto-publish behavior is implemented.
- `/v1/loop/contract` is a boundary contract only; it does not return user data or move local feature state server-side.
- `PHASE6_PROTECTED_API_TOKEN` is temporary pre-Better Auth infrastructure; do not embed it in the mobile app or commit it to the repo.
- Google OAuth code is wired, but live Google sign-in still requires real Railway variables: `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Use redirect URI `https://api-production-0041.up.railway.app/api/auth/callback/google`.
- Profile persistence is metadata-only (`display_name`, `preferred_language`) until KMS/encryption gates clear; do not add legal name, DOB, A-number, address, or document-file storage to this table.
- PDF generation/export is only copy/UI language right now.
- Production auth, KMS/encryption, counsel approval, and filing workflows remain gated.

## How To Run

From the repo root:

```bash
bun install
bun run typecheck
bun run --cwd packages/shared test
bun run --cwd apps/server test
bun run --cwd apps/mobile test
bun run --cwd apps/mobile lint
```

For Xcode/dev-client:

```bash
bun run --cwd apps/mobile ios:run
```

The iOS scripts set:

```bash
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 RUBYOPT=-rlogger
```

That fixes the CocoaPods `ASCII-8BIT` / Unicode normalization failure seen in Terminal.

2026-06-27 QA note: on the current iPhone 17 simulator, the old hardcoded
`ios:run` script port (`8082`) launched to a React Native redbox:
`No script URL provided`. The mobile scripts now use Expo's default Metro port,
which matches the verified simulator launch path:

```bash
bun run --cwd apps/mobile ios:run
```

## Last Known Verification

These commands passed before handoff:

- `bun run --cwd packages/shared test`
- `bun run --cwd apps/server test`
- `bun run --cwd apps/mobile test`
- `bun run typecheck`
- `bun run --cwd apps/mobile lint`
- `bunx expo export --platform ios` from `apps/mobile`
- Railway live contract check: `/health` returned 200, `/v1/loop/contract` returned 401 for missing/invalid auth, and a valid bearer token returned the non-PII `phase6-local-loop-v1` contract with five feature entries.
- Railway Postgres now has Better Auth tables (`user`, `session`, `account`, `verification`) and metadata-only `applicant_profile`.
- `maestro test .maestro/filing-wizard.yaml`
- `maestro test .maestro/tracker-manual-case.yaml`
- `maestro test .maestro/calendar-reminder.yaml`
- `maestro test .maestro/forum-report.yaml`
- `maestro test .maestro/news-source.yaml`

Simulator notes:

- The dev-client build ran on the iPhone 17 simulator through Xcode tooling.
- The app starts on a placeholder auth screen; the Maestro flow signs in, opens Filings, completes the safe non-PII choices, reaches the export shell, and verifies autosave plus no-USCIS-submission copy.
- The tracker Maestro flow signs in, opens Tracker, saves `YSC1234567890` as a manual case, verifies the local-only status text, then checks invalid receipt copy.
- The calendar Maestro flow signs in, opens Calendar, verifies deadline/agenda rendering, then acknowledges and snoozes a deadline-linked reminder locally.
- The forum Maestro flow signs in, opens the iOS native `More` tab, selects Forum, verifies peer-support safety copy, reports the visible post, and blocks the pseudonymous author locally.
- The news Maestro flow signs in, opens the iOS native `More` tab, selects News, verifies official source attribution, and marks an item read locally.
- Maestro was installed locally via `https://get.maestro.mobile.dev`; ensure `$HOME/.maestro/bin` is on `PATH` before running the flow.

## Next Best Slice

Continue Phase 6 hardening from the local feature loop into production-gated work. Filing wizard, manual tracker, calendar reminders, forum safety, and news source attribution now have shared helpers, repository persistence, UI states, and simulator E2E coverage for the current local-data scope. The next useful slice is production integration planning for one of the gated contracts:

- Replace the configured temporary `PHASE6_PROTECTED_API_TOKEN` boundary with Better Auth middleware and user-scoped read/write contracts before any PII path.
- Add the real Google OAuth credentials to Railway, redeploy, then run a live Google sign-in smoke test from the iOS dev client and verify `/v1/profile` creates the caller's metadata-only row.
- Promote calendar reminders from local UI state toward the Railway cron + Expo push contract after device tokens/auth land.
- Promote news from local source cards toward Phase 9 ingestion only after an editorial review queue exists.
- Keep PDF generation, PII storage, file upload, and auto-publish features behind counsel/KMS/security gates.

Recommended tests:

- Keep API contract tests ahead of moving any local repository behavior server-side.
- Security-reviewer pass for auth, PII, upload, PDF, push-token, and editorial-publish code.
- Maestro regression flows for all five local feature surfaces after each production integration.

## Known UX Risks To Address

- Steps with legal judgment warnings should have explicit acknowledgement behavior where needed.
- Final `Export PDF` button must not imply actual submission or silently do nothing.
- “Preview state” / “save-and-resume” copy should become real autosave before it is treated as product behavior.

Resolved in this Stage 6 slice:

- `SelectionCard` can now expose radio/checkbox semantics with checked state; the I-765 reason/category choices use radio roles, and review acknowledgement uses a checkbox role.
- `WizardScaffold` progress now exposes a `progressbar` label and numeric value for assistive tech.
- `.maestro/filing-wizard.yaml` verifies the filing wizard on the iPhone 17 simulator end to end for the current local-data scope.
- Manual tracker receipt persistence is covered by shared helper tests, repository mutation tests, tracker model tests, and `.maestro/tracker-manual-case.yaml`.
- Calendar local reminders are covered by shared reminder tests, calendar model tests, repository mutation tests, and `.maestro/calendar-reminder.yaml`.
- Calendar dispatch planning is covered by shared reminder tests for due-reminder selection, Expo-safe batching, local acknowledgement exclusion, and invalid-date skips.
- Account/profile auth is covered by server tests for Google readiness, authenticated profile reads/writes, PII-field rejection, and mobile profile model tests for Railway-backed vs local-preview state.
- Forum safety is covered by shared forum tests, forum model tests, repository mutation tests, and `.maestro/forum-report.yaml`.
- News source attribution is covered by shared news tests, news model tests, repository mutation tests, and `.maestro/news-source.yaml`.

## GitHub Handoff

This branch is intended to be pushed to:

```bash
origin codex/stage-6-handoff
```

Open a draft PR into `main` if one was not created automatically.
