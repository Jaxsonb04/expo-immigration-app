# Immigration App Master Plan

## Project Status

```yaml
status: in_progress
current_milestone: M1
next_task: M1-T3
last_completed: M1-T2
blockers: []
updated_at: 2026-07-05
```

## Summary

Build four prioritized product areas:

1. Claude form-navigation assistant
2. Form preparation through print-ready PDF
3. Case tracking
4. Community forum

## Progress Contract

Every task uses `[ ]` or `[x]`, plus `Status: NOT_STARTED | IN_PROGRESS | DONE`.
A task becomes `DONE` only after its tests and acceptance checks pass. The
completing agent records evidence and updates `next_task` in the same commit. A
new agent reads the Project Status header and begins only at `next_task`.

## Layout

Use four primary tabs:

- **Assistant:** Default screen containing Claude chat, reminders, and USCIS news.
- **Forms:** Active applications, applicant profiles, saved documents, and the new-form flow.
- **Cases:** Receipt-number tracking and status timelines.
- **Community:** Forum posts and discussions.

Document Vault, account, and settings remain accessible from header actions and
Forms. Keep the interface quiet, mobile-first, and task-oriented.

## UI Development Rules

- Use `heroui-native` and `heroui-native-pro` as the default component libraries for all app UI.
- Before starting a UI task, read and follow the relevant `heroui-native-pro` and `heroui-pro-design-taste` skills.
- Use the HeroUI Native Pro MCP for current APIs. Always call `list_components` first, then call `get_component_docs` for each selected component before implementation.
- Use `get_docs` for provider, theming, styling, composition, or animation guidance and `get_theme_variables` before adding or changing theme tokens.
- Import base components from `heroui-native` and Pro components from `heroui-native-pro`; never use HeroUI web packages or guess component names and props.
- Prefer existing HeroUI components and semantic Uniwind tokens over hand-built controls. Use React Native primitives only when the MCP confirms that no suitable HeroUI component exists.

## Milestones

- [x] **M0-T1 Foundation**
  - Status: DONE
  - Record baseline tests and amend ADR-0003 because forums/news were previously excluded.
  - Done when: The amended architecture decisions are reviewed and baseline checks are recorded.
  - Evidence: Baseline green at `039442f` — typecheck ✓, lint ✓, 85/85 vitest tests ✓ (4 files) — recorded in `docs/BASELINE.md`. ADR-0003 amended 2026-07-05 (`docs/adr/0003-v1-scope-i90-i765.md`) to withdraw the forum/news exclusion (M4 Community forum + M5-T2 Recent news now in v1 scope) and reconcile the stale "monetization" exclusion against ADR-0011; the amendment was reviewed by a 3-lens adversarial panel (ADR-consistency, UPL/scope-boundary, factual-wording) — all approved, low-severity polish incorporated.

- [x] **M0-T2 Navigation**
  - Status: DONE
  - Implement the four-tab shell, empty/loading/error states, and migrate existing Home/Documents entry points.
  - Done when: Assistant, Forms, Cases, and Community tabs work on iOS without navigation regressions.
  - Evidence: Four `NativeTabs` — Assistant (`(assistant)`, holds index `/`, default tab), Forms (`/forms`), Cases (`/cases`), Community (`/community`). Migrated the old `(home)` tab → `forms/` and folded the `documents` tab into `forms/documents` (Document Vault now reached via a Forms header action + attention items, per ADR-0003 Layout); `/application/[id]` → `/forms/application/[id]` and `/documents` → `/forms/documents`, with all five `router.push` refs updated. Added reusable `ScreenLoading`/`ScreenEmpty`/`ScreenError` in `src/components/core/screen-state.tsx`; Assistant/Cases/Community render intentional empty states (features land in M1/M3/M4). Verified: `tsc` ✓ (against freshly regenerated typed-routes — strict Href validation), `eslint` ✓, 85/85 vitest ✓; Expo Router parsed the 4-tab tree with no route conflicts (single `/` index). Driven in the iOS simulator (iPhone 17, `expo run:ios`): all four tabs navigate via Maestro with correct titles, selection states, and empty-state copy; Forms shows the Documents header action + migrated dashboard; screenshots captured. Empty states ship **icon-less** — the `@react-native-vector-icons` glyph map is newer than the bundled TTFs, so decorative in-screen glyphs mis-render (lucide `sparkles` → 😂, feather → □); flagged as a follow-up to fix before M1-T3's icon-heavy chat UI.

- [x] **M1-T1 Claude backend**
  - Status: DONE
  - Add a validated Convex action using the Anthropic Messages API.
  - Store `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` only in Convex deployment secrets.
  - Done when: An authenticated or anonymous owner can receive a validated response without exposing secrets to the client.
  - Evidence: `convex/assistant.ts` — a `"use node"` `sendMessage` action calls the Anthropic Messages API via `@anthropic-ai/sdk` (model from `ANTHROPIC_MODEL`, default `claude-opus-4-8`; key from `ANTHROPIC_API_KEY`), both declared in `convex.config.ts` env and read server-side only — never returned to the client (result is `{reply, usage}`). The action holds no DB access; authorization + the 20/day per-owner quota are enforced by internal mutations in `convex/assistantQuota.ts` (`requireOwnerId`-scoped; `reserveDailyMessage`/`refundDailyMessage` + public `dailyUsage`), backed by the new `assistantUsage` table (wiped by the account-deletion cascade). Anonymous and authenticated owners are treated identically (ADR-0009). Input is validated (non-empty, ≤4000 chars, ≤40 history turns); refusals and API errors refund the reserved message. TDD: `convex/assistant.test.ts` — 11 tests (happy path, history ordering, no-secret-leak, auth required, empty/over-long input, 20-message limit, owner isolation, missing-key config error, API-error refund, refusal handling). Verified: `tsc` ✓, `eslint` ✓, **96/96** vitest ✓; `convex codegen` bundled + deployed the Node action to the dev deployment without error. Security-reviewed (secrets, owner isolation, quota bypass, input validation). Live end-to-end needs a real key set via `npx convex env set ANTHROPIC_API_KEY` (not set — it's the owner's secret).

- [x] **M1-T2 Safe navigator**
  - Status: DONE
  - Claude gathers plain-language facts; deterministic application logic selects only the five supported I-765/I-90 situations.
  - Never infer eligibility categories or provide legal advice.
  - Done when: All supported, ambiguous, and out-of-scope scenarios return the expected typed result.
  - Evidence: `convex/shared/navigator.ts` — Claude extracts only four plain-language `NavigatorFacts` (credential/situation + two orthogonal legal-advice/out-of-scope flags) via structured output; a pure `classifyFacts` + deterministic `preScreen` (raw-text regex for eligibility category codes, legal-advice phrases, and unsupported forms) produce the `AssistantRecommendation` union (`supported`/`needsClarification`/`outOfScope`), reusing `isSupportedSituation`. Only honest facts that map to one of the five supported situations can yield `supported`; `unsupportedForm` precedes `legalAdvice`; off-schema model output falls back to `needsClarification`. `convex/navigator.ts` (`getRecommendation`, "use node") extracts + Zod-validates + classifies, sharing the M1-T1 owner quota. Design vetted by a 5-agent adversarial panel (design critic + 3 generators + synthesis) which flagged and drove fixes for a CRITICAL trust-boundary issue; captured in `docs/adr/0015-safe-navigator-facts-not-decisions.md`. Tests: 53 classifier/matrix + 8 action = 61 new, encoding the vetted 32-scenario matrix (all 5 supported situations, ambiguity, unsupported forms, 6 prompt-injections, 6 legal-advice baits) with a hard invariant that no injection/legal-advice/out-of-scope input ever reaches `supported`; a mocked action test proves the pre-screen overrides a jailbroken "supported"-looking extraction. Verified: `tsc` ✓, `eslint` ✓, **159/159** vitest ✓; `convex codegen` deployed the action. App model set to cheapest (`claude-haiku-4-5`). Live extraction-quality eval against the real model deferred to M1-T3 (authenticated simulator flow).

- [ ] **M1-T3 Chat UI**
  - Status: NOT_STARTED
  - Add current-session message history, suggested replies, loading/retry states, disclaimers, and a recommendation card.
  - Done when: The complete conversation flow works in the iOS simulator with accessible controls.
  - Evidence: Not recorded.

- [ ] **M1-T4 Form handoff**
  - Status: NOT_STARTED
  - “Start this form” opens the existing application creation flow with the recommended form and application kind preselected.
  - Done when: Each supported recommendation creates the correct application draft after user confirmation.
  - Evidence: Not recorded.

- [ ] **M2-T1 Form audit**
  - Status: NOT_STARTED
  - Compare every I-765/I-90 interview answer with the bundled USCIS editions and document missing questions or field mappings.
  - Done when: Every required supported-flow field has an interview source, validation rule, and PDF destination.
  - Evidence: Not recorded.

- [ ] **M2-T2 Complete pipeline**
  - Status: NOT_STARTED
  - Finish interview branching, Next-only persistence, applicant-profile autofill, document requirements, and review.
  - Done when: All five supported situations reach Review with valid persisted data.
  - Evidence: Not recorded.

- [ ] **M2-T3 Document saver**
  - Status: NOT_STARTED
  - Implement real uploads, versioning, requirement attachment, expiry metadata, and reusable applicant information.
  - Done when: A saved profile and current documents can populate a later application without re-entry.
  - Evidence: Not recorded.

- [ ] **M2-T4 PDF output**
  - Status: NOT_STARTED
  - Preserve free watermarked previews; add entitlement-checked clean PDFs, filing instructions, validation, and edition metadata.
  - Done when: Supported applications export a complete print-ready package while keeping Service and USCIS Filing Fees separate.
  - Evidence: Not recorded.

- [ ] **M3-T1 Case management**
  - Status: NOT_STARTED
  - Add receipt numbers using `^[A-Z]{3}\d{10}$`, link optional applications, and support manual status-history updates.
  - Done when: Owner-scoped case creation and updates pass validation and authorization tests.
  - Evidence: Not recorded.

- [ ] **M3-T2 Case experience**
  - Status: NOT_STARTED
  - Build case list/detail screens, official USCIS status links, RFE emphasis, and filed-application handoff.
  - Done when: A user can create, inspect, and update a case from the simulator.
  - Evidence: Not recorded.

- [ ] **M4-T1 Forum backend**
  - Status: NOT_STARTED
  - Add pseudonymous community profiles, posts, comments, reports, pagination, and moderation status indexes.
  - Done when: Public reads are bounded and writes enforce identity, ownership, and validators.
  - Evidence: Not recorded.

- [ ] **M4-T2 Forum UI**
  - Status: NOT_STARTED
  - Allow anonymous reading; require an upgraded account to post, comment, or report. Exclude DMs and attachments from v1.
  - Done when: Read, post, comment, and report flows work with the correct account gates.
  - Evidence: Not recorded.

- [ ] **M4-T3 Moderation**
  - Status: NOT_STARTED
  - Add reporting, admin-only moderation, community rules, and warnings that posts are not legal advice.
  - Done when: Authorized moderators can hide and restore reported content without exposing private owner identifiers.
  - Evidence: Not recorded.

- [ ] **M5-T1 Renewal reminders**
  - Status: NOT_STARTED
  - Schedule 180/90/30/7/1-day reminders from current document expiry dates; require a recoverable account.
  - Done when: Reminder scheduling, rescheduling, permissions, and account gating are verified.
  - Evidence: Not recorded.

- [ ] **M5-T2 Recent news**
  - Status: NOT_STARTED
  - Cache and display the latest official USCIS news with source links, timestamps, and a stale-cache fallback.
  - Done when: The Assistant screen displays bounded official items and remains usable during source failures.
  - Evidence: Not recorded.

- [ ] **M5-T3 Release audit**
  - Status: NOT_STARTED
  - Verify privacy, account deletion, accessibility, analytics, rate limits, disclaimers, and App Store readiness.
  - Done when: All release checks pass and remaining risks are explicitly documented.
  - Evidence: Not recorded.

## Interfaces

`AssistantRecommendation` is a discriminated union: `supported`,
`needsClarification`, or `outOfScope`. Supported results contain only validated
`formType` and `applicationKind` values. Chat transcripts remain
device-session-only initially; Convex stores only per-owner daily usage counters
with a 20-message limit.

Forum storage adds `communityProfiles`, `forumPosts`, `forumComments`, and
`forumReports`. Case and document functionality extend the existing tables
rather than replacing them.

## Test Plan

- Classification matrix for all five supported situations, ambiguity, unsupported forms, prompt injection, and legal-advice requests.
- Convex authorization, owner isolation, quotas, case validation, forum pagination, reporting, and moderation tests.
- PDF field-map tests against bundled USCIS forms and clean/watermarked export tests.
- Simulator flows: chat to form, profile reuse, document upload, PDF export, case creation, and forum reporting.
- Each milestone ends with lint, typecheck, unit tests, simulator verification, and a `DONE` evidence entry.

## Assumptions

The chatbot is an informational navigator, not an eligibility adviser. Case
tracking is manual in v1 and does not scrape USCIS. News comes only from official
USCIS sources. Existing I-765/I-90, Convex, Better Auth, HeroUI, PDF, and
RevenueCat architectural decisions remain in force.
