# Immigration App Master Plan

## Project Status

```yaml
status: in_progress
current_milestone: M2
next_task: M2-T4
last_completed: M2-T3
blockers: []
updated_at: 2026-07-06
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

- [x] **M1-T3 Chat UI**
  - Status: DONE
  - Add current-session message history, suggested replies, loading/retry states, disclaimers, and a recommendation card.
  - Done when: The complete conversation flow works in the iOS simulator with accessible controls.
  - Evidence: **Navigator-first** chat (decision confirmed with owner): each user message runs the deterministic `navigator.getRecommendation` action exactly once (one billed Claude call per turn, shared 20/day quota), and the clarify→recommend loop *is* the conversation — no freeform `sendMessage` surface in v1, keeping the UPL/legal-advice attack surface minimal. New `src/screens/assistant/`: `assistant.data.ts` (`useAssistantChat` hook — device-session-only transcript per MASTER_PLAN Interfaces, optimistic user+pending turns, synchronous `isSendingRef` guard so rapid double-taps can't double-fire the billed action, `send` returns acceptance so the composer only clears on an accepted send, `retry`, reactive `dailyUsage` quota); `assistant.recommendation.ts` (the ONLY place the structured `AssistantRecommendation` becomes user-facing copy — exhaustive `switch` with a `never` guard; client never re-derives eligibility); `assistant.message.tsx`/`assistant.recommendation-card.tsx`/`assistant.suggested-replies.tsx`/`assistant.composer.tsx`/`assistant.screen.tsx`/`assistant.types.ts`. Built on `heroui-native` (Surface/Card/Chip/Button/InputGroup/Spinner/Avatar) per the UI rules; composer uses `react-native-keyboard-controller`'s `KeyboardStickyView` (the app's existing keyboard idiom) and the transcript ScrollView uses `contentInsetAdjustmentBehavior="automatic"` so content clears the native large-title header (auto-scroll only fires once the transcript overflows the viewport, so a single short turn isn't tucked under the title). Opening suggestions carry complete situations so the common cases resolve in one tap; "Start this form" is the M1-T4 handoff (currently an honest placeholder alert). Adversarially reviewed (react-reviewer) — fixed a stale-closure double-fire race, a fragile id-assignment ordering, and lost-input-on-rejected-send. **Icon-font fix (M0-T2 follow-up):** root-caused the mis-rendering glyphs — NOT a "glyphmap newer than TTF" mismatch as M0-T2 guessed, but that `ios/` was never clean-prebuilt after the `@react-native-vector-icons/*` config plugins were added, so `UIAppFonts` was empty and no icon font was embedded (SF Symbols in the tab bar masked it). Fixed operationally with `expo prebuild --clean` (fonts are linked via the RNVI pods + family plugins' `UIAppFonts`; `app.json` net-unchanged, `ios/` is gitignored/CNG). Also hardened `convex/navigator.ts` to log the underlying Anthropic error server-side instead of swallowing it silently. Verified: `tsc` ✓, ESLint ✓ (the real style gate — repo has no prettier config; enforced via `eslint.config.js`), **172/172 vitest** ✓ (13 new: full copy-contract for every union arm incl. all 5 supported situations, both clarification sub-cases, all 3 out-of-scope reasons, and opening-reply completeness). Driven live in the iOS simulator (iPhone 17, `expo run:ios`) via Maestro with a **real Anthropic key** set in Convex: greeting + opening chips render with correct icons (sparkle avatar, send arrow, info glyph — font fix confirmed); tapping "Renew my work permit" → `supported` I-765 renewal → recommendation card ("Work permit renewal / Form I-765" + "Start this form"), quota decrementing 20→17 across billed calls; "Start this form" → M1-T4 placeholder alert; and the error+retry state verified (against the initial invalid key). Screenshots captured. NOTE: the initially-configured `ANTHROPIC_API_KEY` returned `401 invalid x-api-key`; root-caused deterministically via a throwaway diagnostic action (since deleted) — a gateway key + then a real `sk-ant-api03-…` key resolved it; a valid key must stay set in the Convex deployment env for the live path.

- [x] **M1-T4 Form handoff**
  - Status: DONE
  - “Start this form” opens the existing application creation flow with the recommended form and application kind preselected.
  - Done when: Each supported recommendation creates the correct application draft after user confirmation.
  - Evidence: The assistant recommendation card's "Start this form" now deep-links to the existing create-application modal (`/new-application`) with the recommended form + kind as router params (`assistant.screen.tsx` `handleStart` → `router.push({ pathname: '/new-application', params: { formType, applicationKind } })`, replacing the M1-T3 placeholder alert). To keep pure logic unit-testable (the hook pulls in `convex/react`/`expo-router`, which the vitest edge-runtime can't import), the situation helpers were extracted into a new pure module `new-application.situations.ts` (`situationKey`, `parseSituationKey`, choice constants, and the new `situationKeyFromParams`), which `new-application.data.ts` re-exports (`export *`) so existing `./new-application.data` importers are unchanged. `NewApplicationScreen` reads the params via `useLocalSearchParams` and seeds the form's `situationKey` default through `situationKeyFromParams`, which preselects the radio **only** when the params name one of the five supported situations (unknown/unsupported/injection params → `''`, no preselection) — the deterministic safety boundary holds; the user still confirms the applicant and taps Start. Tests: `new-application.situations.test.ts` — 7 new (all 5 supported combos preselect the right key; unsupported i90-initial, unknown form, malformed, and missing params all yield `''`). Verified: `tsc` ✓, ESLint ✓, **179/179 vitest** ✓. Live in the iOS simulator (Maestro): "Renew my work permit" → I-765 renewal card → "Start this form" → the create modal opened with **"Work Permit renewal (Form I-765)" preselected**; choosing "Myself" + "Start application" created the correct **I-765 renewal draft** (journey hub: "Work Permit renewal / Form I-765 / Step 1 of 7", with the I-765-renewal document requirements) and dismissed to `/forms/application/[id]`. The remaining four supported combos are covered by the unit tests and use the identical param→preselect→`createApplication` path.

- [x] **M2-T1 Form audit**
  - Status: DONE
  - Compare every I-765/I-90 interview answer with the bundled USCIS editions and document missing questions or field mappings.
  - Done when: Every required supported-flow field has an interview source, validation rule, and PDF destination.
  - Evidence: Full traceability audit in `docs/M2-T1-form-field-audit.md`. Cross-referenced all three axes — **interview source** (`interview.form.ts` step descriptors / `interviewSteps.ts`), **validation rule** (`fieldValidators` + `applicationShapes.ts` Zod shapes), and **PDF destination** (`pdf.i765-map.ts` / `pdf.i90-map.ts`) — against the ground-truth AcroForm inventory dumped from the bundled editions (`assets/forms/i-765.pdf` ed. 2025-08-26, 161 fields; `assets/forms/i-90.pdf` ed. 2025-02-27, 195 fields) via `pdf-lib`. Findings: the walkthrough-phase flow solidly covers name/DOB/country-of-birth/A-Number/mailing-address across all five situations, but **none are fileable end-to-end**. Three gap classes documented: (1) *mapped but no source* — I-765 `Line12b_SSN` is wired yet never collected; (2) *collected but never written* — I-765 & I-90 `replacementReason`, I-90 `cardExpirationDate`, and the dead `previousEadCardNumber`; (3) *required by USCIS, entirely absent* — most critically the **I-90 Part 2 application-type/reason checkboxes are entirely unmapped, so the generated I-90 indicates no renewal-vs-replacement reason at all** (P0), plus country of citizenship + city of birth (I-765), and gender/city-of-birth/mother+father names/biometrics(height,weight,eye,hair,race)/class-of-admission (I-90), and phone/email/signature on both. Includes a per-situation coverage table and a prioritized M2-T2 remediation plan. Accuracy discipline: USCIS-required judgments are marked `[confirm]` where inferred, and I-765 gender is explicitly NOT asserted as a gap because that edition's generic `LineNN` checkbox names don't track printed items (the map warns of this) — only self-named fields (all the I-90 gaps, I-765 phone/email/signature/city-of-birth) are asserted with confidence. No code changed (audit only); remediation is M2-T2.

- [x] **M2-T2 Complete pipeline**
  - Status: DONE
  - Finish interview branching, Next-only persistence, applicant-profile autofill, document requirements, and review.
  - Done when: All five supported situations reach Review with valid persisted data.
  - Evidence: Scoped via an **ultracode** workflow — 5 parallel subsystem auditors (branching, persistence, autofill, requirements, review) reading the code over SSH + a synthesis agent. Finding: the pipeline mechanically **already reached Review with valid data for all 5 situations** (zero P0 blockers; branching is correctly done as conditional fields + kind-aware validators, not step-visibility; persistence, autofill/promotion, requirement materialization, and Review-reach all functioned) — but the "valid data" guarantee lived **only on the client**, so a replayed/forged/buggy mutation could mark a pre-Review step complete on invalid data and unlock Review + the free PDF Preview. M2-T2 converts that to a **server-enforced** guarantee (scope kept to pipeline mechanics; the missing USCIS *fields* from the M2-T1 audit are deferred to M2-T4 — no missing field blocks reaching Review). Changes: new pure `convex/shared/interviewValidation.ts` giving the server its own authoritative view — `stepOwnedKeys` (which draft keys each step owns) + `isStepComplete(formType, kind, stepKey, answers)` (kind-aware: A-Number optional only for i765-initial; replacementReason required only for the two replacement situations; vacuous-optional steps like i90 renewal card-details complete correctly). `saveApplicationStep` (`convex/applications.ts`) now: (1) rejects any non-preReview key incl. `REVIEW_STEP_KEY` so 'review' can never be marked complete; (2) is **authoritative for the saved step** — it clears that step's owned keys before applying the incoming slice, so a cleared optional (e.g. a removed middle name) is actually dropped instead of surviving a shallow merge into the filed PDF; (3) marks a step complete **only when `isStepComplete` passes on the persisted draft**, not on a client-supplied boolean. Also corrected a comment in `interviewSteps.ts` that falsely promised answer-dependent document reconciliation (requirements are static per formType+kind today; answer-driven docs deferred — reason-specific document sets need a domain decision). Deliberately deferred the P2 `fieldPaths`-conditional cleanup (benign; would ripple the StepDescriptor type). Tests (+23 → **202 total**): `interviewValidation.test.ts` (15 — stepOwnedKeys⇔blueprint sync, isStepComplete happy/negative/kind-aware, never-completes-review); `applications.test.ts` (+8 — server rejects the review key, does NOT complete a step on missing data, clears a stale optional on re-save, and a parametrized **end-to-end walk proving all 5 supported situations reach `review` with completedStepCount 6/7** through the real mutation). Verified: `tsc` ✓, ESLint ✓, **202/202 vitest** ✓, deployed to Convex, and confirmed live in the iOS simulator (fresh I-765 renewal: filled the legal-name step → Next advanced 1/6 → 2/6, proving a real client payload passes the new server gate). Adversarially reviewed (code-reviewer) for gate-bypass and merge-corruption.

- [x] **M2-T3 Document saver**
  - Status: DONE
  - Implement real uploads, versioning, requirement attachment, expiry metadata, and reusable applicant information.
  - Done when: A saved profile and current documents can populate a later application without re-entry.
  - Evidence: The Vault schema (`documents` with storageId/expiry/supersession, `applicationDocuments` slots with a `documentId` link) and Convex file storage already existed, but no mutations wired real uploads. New `convex/documents.ts` (5 owner-scoped mutations): `generateUploadUrl` (auth-gated short-lived upload URL), `saveDocument` (record an uploaded file as a Vault document for an owned applicant, with expiry-format validation), `attachDocument` (link a Vault document to a requirement slot — the **reuse** path: a document uploaded once satisfies the matching requirement on ANY of that applicant's applications, gated so the document must belong to the same applicant the application is for), `detachDocument`, and `uploadNewVersion` (decision 9: appends a superseding row via supersedesId/supersededById and re-points every slot on the old version to the new one). Every mutation calls `requireOwnerId` and re-checks ownership on every id it's handed (document/slot/applicant) — ids are never trusted. `getApplication` now also returns the applicant's current (non-superseded) Vault documents so the UI can resolve an attached slot's document and offer the reuse picker in one round-trip. UI: rewrote the Journey Hub Documents section (`journey-hub.documents.tsx` + `journey-hub.documents.data.ts`) — each `needed` slot offers **Upload** (expo-document-picker → generateUploadUrl → POST the file → saveDocument → attachDocument, with a requirementKey→documentType map) and, when the applicant already has Vault documents, **Use saved** (an inline reuse picker → attachDocument, no re-upload); `attached` slots show the resolved document label + expiry with **Remove** (detach). **Profile reuse** (the other half of the acceptance) already works via M2-T2 autofill (createApplication seeds person-facts from the applicant profile). Tests: `convex/documents.test.ts` — 10, covering owner isolation (foreign owner rejected on save/attach), cross-applicant rejection (a document can't satisfy another applicant's slot), malformed-expiry rejection, detach, versioning (supersede + slot re-point + refuse-to-branch), and the **reuse acceptance** (a document uploaded for an applicant attaches to a brand-new later application's slot with no re-upload). Verified: `tsc` ✓, ESLint ✓, **212/212 vitest** ✓, deployed to Convex. Live in the iOS simulator: the Documents section renders Upload/Use-saved affordances per slot and **the Upload button opens the iOS document picker** (the full upload→attach flow can't be completed in the simulator because it has no files to pick; the attach/reuse/detach/versioning logic is covered by the backend tests). Security-reviewed (security-reviewer): **no CRITICAL/HIGH** — ownership is re-checked on every id, `ownerId` is always server-derived, no cross-owner or cross-applicant exploit (backed by tests). Applied the review's hardening: an existence check on the client-supplied storageId (no dangling Vault refs) and a bounded slot re-point. The one MEDIUM (Convex returns a storageId only after upload, so a blob can't be owner-bound at issue time) is documented in-code as not currently exploitable — storageIds are never exposed cross-owner — with an explicit requirement that M2-T4's download surface serve files ONLY through owner-scoped document rows.

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
