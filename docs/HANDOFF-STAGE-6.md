# Stage 6 Handoff

Date: 2026-06-27
Branch: `codex/stage-6-handoff`
Base: `main` at `c19f9f4`

## What Landed

- Stage 6 local feature loop foundation for the Expo mobile app.
- `DESIGN.md` visual direction applied in mobile tokens/global CSS: warm paper background, white cards, near-black text, blue accent, Fraunces headings, DM Sans body.
- Thin route files under `apps/mobile/src/app/(tabs)` now delegate to feature modules under `apps/mobile/src/features`.
- Shared client-safe DTOs were expanded under `packages/shared/src` for applications, cases, deadlines, documents, profile, loop snapshots, selectors, and I-765 drafts.
- Local loop repository/data added for mock-only state. It includes an active I-765 draft, manual case status, deadlines, document metadata, and profile summary.
- Home hub, Profile/Vault metadata surface, I-765 wizard shell, manual Tracker, and Calendar surfaces are implemented with local data.
- Manual tracker receipt entry now validates USCIS-style receipt numbers, saves a local government-side case summary, and keeps the no-live-USCIS-sync disclaimer visible.
- Calendar now renders deadline-linked reminder plans with local acknowledge/snooze state. It does not claim push delivery; Railway cron + Expo push remain production contracts until auth and device tokens land.
- Calendar grid was fixed to render real month cells instead of fake overflow dates.
- Mobile screen wrapper now handles iOS safe areas for the dev-client/native tab layout.
- CocoaPods UTF-8 workaround is in the mobile iOS scripts.

## Important Gates

- No real PII storage is implemented.
- No file upload/storage is implemented.
- No USCIS submission wording or submission action is implemented.
- Tracker is manual-first; no live USCIS sync dependency.
- Reminder delivery is local UI state only; no push token registration, Railway cron worker, or Expo push send is implemented.
- PDF generation/export is only copy/UI language right now.
- Production auth, KMS/encryption, counsel approval, and filing workflows remain gated.
- Forum and news are still deferred.

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

Simulator notes:

- The dev-client build ran on the iPhone 17 simulator through Xcode tooling.
- The app starts on a placeholder auth screen; the Maestro flow signs in, opens Filings, completes the safe non-PII choices, reaches the export shell, and verifies autosave plus no-USCIS-submission copy.
- The tracker Maestro flow signs in, opens Tracker, saves `YSC1234567890` as a manual case, verifies the local-only status text, then checks invalid receipt copy.
- The calendar Maestro flow signs in, opens Calendar, verifies deadline/agenda rendering, then acknowledges and snoozes a deadline-linked reminder locally.
- Maestro was installed locally via `https://get.maestro.mobile.dev`; ensure `$HOME/.maestro/bin` is on `PATH` before running the flow.

## Next Best Slice

Continue Phase 6 with the next feature loop. Filing wizard, manual tracker, and calendar reminders now have shared helpers, repository persistence, UI states, and simulator E2E coverage for the current local-data scope. The next useful slice is the forum safety shell:

- Add categories/thread/post DTOs and a local forum feed without legal-advice positioning.
- Include reporting and moderation states from day one.
- Keep identity pseudonymous/local until production auth is ready.
- Add Maestro coverage for opening the forum surface and reporting a post.

Recommended tests:

- Shared forum model tests for report reasons, moderation state labels, and safe copy.
- Repository tests proving reports/moderation flags do not mutate filings, tracker cases, documents, or PII.
- Maestro flow for the forum/reporting path once the tab or entry point lands.

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

## GitHub Handoff

This branch is intended to be pushed to:

```bash
origin codex/stage-6-handoff
```

Open a draft PR into `main` if one was not created automatically.
