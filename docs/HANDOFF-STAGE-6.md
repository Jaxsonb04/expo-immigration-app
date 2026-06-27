# Stage 6 Handoff

Date: 2026-06-27
Branch: `codex/stage-6-handoff`
Base: `main` at `c19f9f4`

## What Landed

- Stage 6 local feature loop foundation for the Expo mobile app.
- `DESIGN.md` visual direction applied in mobile tokens/global CSS: warm paper background, white cards, near-black text, blue accent, Fraunces headings, DM Sans body.
- Thin route files under `apps/mobile/src/app/(tabs)` now delegate to feature modules under `apps/mobile/src/features`.
- Shared client-safe DTOs were expanded under `packages/shared/src` for applications, cases, deadlines, documents, profile, loop snapshots, selectors, I-765 drafts, forum safety, and news source attribution.
- Local loop repository/data added for mock-only state. It includes an active I-765 draft, manual case status, deadlines, document metadata, profile summary, forum safety data, and news source/editorial data.
- Home hub, Profile/Vault metadata surface, I-765 wizard shell, manual Tracker, and Calendar surfaces are implemented with local data.
- Manual tracker receipt entry now validates USCIS-style receipt numbers, saves a local government-side case summary, and keeps the no-live-USCIS-sync disclaimer visible.
- Calendar now renders deadline-linked reminder plans with local acknowledge/snooze state. It does not claim push delivery; Railway cron + Expo push remain production contracts until auth and device tokens land.
- Forum safety shell now renders pseudonymous local categories, visible threads/posts, peer-support-only safety copy, reporting, and local author blocking.
- News source/editorial shell now renders official USCIS/Federal Register source cards, editorially reviewed local news items, source URLs, published dates, summaries, tags, and local read state.
- Calendar grid was fixed to render real month cells instead of fake overflow dates.
- Mobile screen wrapper now handles iOS safe areas for the dev-client/native tab layout.
- CocoaPods UTF-8 workaround is in the mobile iOS scripts.

## Important Gates

- No real PII storage is implemented.
- No file upload/storage is implemented.
- No USCIS submission wording or submission action is implemented.
- Tracker is manual-first; no live USCIS sync dependency.
- Reminder delivery is local UI state only; no push token registration, Railway cron worker, or Expo push send is implemented.
- Forum is local and pseudonymous only; no production auth identity, backend moderation queue, abuse-block sync, or legal-advice escalation workflow is implemented.
- News is local and editorially gated only; no Railway cron ingestion, scraping, summarization worker, or auto-publish behavior is implemented.
- PDF generation/export is only copy/UI language right now.
- Production auth, KMS/encryption, counsel approval, and filing workflows remain gated.

## How To Run

From the repo root:

```bash
bun install
bun run typecheck
bun run --cwd packages/shared test
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
- `bun run --cwd apps/mobile test`
- `bun run typecheck`
- `bun run --cwd apps/mobile lint`
- `bunx expo export --platform ios` from `apps/mobile`
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

- Wire real auth + protected API read/write boundaries before any PII path.
- Promote calendar reminders from local UI state toward the Railway cron + Expo push contract after device tokens/auth land.
- Promote news from local source cards toward Phase 9 ingestion only after an editorial review queue exists.
- Keep PDF generation, PII storage, file upload, and auto-publish features behind counsel/KMS/security gates.

Recommended tests:

- API contract tests before moving any local repository behavior server-side.
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
- Forum safety is covered by shared forum tests, forum model tests, repository mutation tests, and `.maestro/forum-report.yaml`.
- News source attribution is covered by shared news tests, news model tests, repository mutation tests, and `.maestro/news-source.yaml`.

## GitHub Handoff

This branch is intended to be pushed to:

```bash
origin codex/stage-6-handoff
```

Open a draft PR into `main` if one was not created automatically.
