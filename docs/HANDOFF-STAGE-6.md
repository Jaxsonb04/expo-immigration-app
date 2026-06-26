# Stage 6 Handoff

Date: 2026-06-26
Branch: `codex/stage-6-handoff`
Base: `main` at `c19f9f4`

## What Landed

- Stage 6 local feature loop foundation for the Expo mobile app.
- `DESIGN.md` visual direction applied in mobile tokens/global CSS: warm paper background, white cards, near-black text, blue accent, Fraunces headings, DM Sans body.
- Thin route files under `apps/mobile/src/app/(tabs)` now delegate to feature modules under `apps/mobile/src/features`.
- Shared client-safe DTOs were expanded under `packages/shared/src` for applications, cases, deadlines, documents, profile, loop snapshots, selectors, and I-765 drafts.
- Local loop repository/data added for mock-only state. It includes an active I-765 draft, manual case status, deadlines, document metadata, and profile summary.
- Home hub, Profile/Vault metadata surface, I-765 wizard shell, manual Tracker, and Calendar surfaces are implemented with local data.
- Calendar grid was fixed to render real month cells instead of fake overflow dates.
- Mobile screen wrapper now handles iOS safe areas for the dev-client/native tab layout.
- CocoaPods UTF-8 workaround is in the mobile iOS scripts.

## Important Gates

- No real PII storage is implemented.
- No file upload/storage is implemented.
- No USCIS submission wording or submission action is implemented.
- Tracker is manual-first; no live USCIS sync dependency.
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

## Last Known Verification

These commands passed before handoff:

- `bun run --cwd packages/shared test`
- `bun run --cwd apps/mobile test`
- `bun run typecheck`
- `bun run --cwd apps/mobile lint`
- `bunx expo export --platform ios` from `apps/mobile`

Simulator notes:

- The dev-client build ran on the iPhone 17 simulator through Xcode tooling.
- The app starts on a placeholder auth screen; press `Continue` to enter the Stage 6 tabs.
- macOS accessibility permission blocked automated Simulator tapping from this machine, so tab QA screenshots were captured before a later app restart.

## Next Best Slice

Continue Phase 6 with the filing wizard. The smallest useful next slice is:

- Add schema metadata in `packages/shared/src/forms/i765.ts` for the existing ten wizard steps.
- Make only the current non-PII fields executable first: `reason`, `eligibilityCategory`, and `reviewAcknowledged`.
- Add pure helpers such as `getI765Step`, `getI765CanContinue`, `applyI765DraftPatch`, and `getI765CompletionPercent`.
- Derive `apps/mobile/src/features/filings/wizard-model.ts` from shared schema metadata instead of a separate static model.
- Extend the local loop repository with in-memory draft autosave for schema-declared `pii: false` fields only.
- Update `FilingsScreenContent` to initialize from draft answers, autosave on choice changes, and keep final action language as `Export PDF`.

Recommended tests:

- Shared schema tests for step count, legal-gate metadata, no-submit wording, valid patch updates, and rejection of unknown/PII keys.
- Wizard model tests for disabled Continue until valid on reason/category/review.
- Repository tests that autosave updates `answers`, `updatedAt`, `currentStep`, and `completionPercent` without touching documents/files/cases.
- Later mobile component tests with React Native Testing Library for tapping choices and verifying navigation state.

## Known UX Risks To Address

- `SelectionCard` currently uses `accessibilityRole="button"` for radio-like choices; reason/category should behave like radio options and review acknowledgement like a checkbox.
- `WizardScaffold` progress is visual-only; add accessible label/value.
- Steps with legal judgment warnings should have explicit acknowledgement behavior where needed.
- Final `Export PDF` button must not imply actual submission or silently do nothing.
- “Preview state” / “save-and-resume” copy should become real autosave before it is treated as product behavior.

## GitHub Handoff

This branch is intended to be pushed to:

```bash
origin codex/stage-6-handoff
```

Open a draft PR into `main` if one was not created automatically.
