# Session handoff — immigration app workflow repair

**Written 2026-07-20.** Repo state at handoff: `main` clean and pushed, HEAD `e7f3de9`,
573 tests green, `tsc --noEmit` clean, eslint clean.

---

## 0. HOW TO WORK ON THIS (read first)

**The code is on a REMOTE Mac. Your local file tools (Read/Edit/Write/Grep/Glob) do NOT
see it** — they see an empty laptop. The repo is at `~/develop/expo_immigration_app` on
the machine reached by `ssh jaxson-build` (passwordless).

The loop that works:

```bash
# read
ssh jaxson-build 'cat ~/develop/expo_immigration_app/<path>'
ssh jaxson-build "cd ~/develop/expo_immigration_app && grep -rn 'pattern' src convex"

# edit: scp the file down, edit LOCALLY with Edit/Write, scp it back
scp -q jaxson-build:develop/expo_immigration_app/<path> /tmp/work/
#   ...edit /tmp/work/<file>...
scp -q /tmp/work/<file> jaxson-build:develop/expo_immigration_app/<path>

# verify (PATH export is REQUIRED — bun/node are in /usr/local/bin)
ssh jaxson-build 'export PATH=/usr/local/bin:$PATH && cd ~/develop/expo_immigration_app \
  && bun run typecheck && bun run test:once && bunx eslint <changed paths>'
```

- **ESLint is the style gate** (not prettier). A `.prettierrc` now exists (I added it —
  the repo had a `format` script but no config, so bare `prettier --write` had been
  restyling files to defaults). If you run prettier, it is now safe.
- `git` runs on the remote Mac and uses that machine's GitHub credentials.
- If `ssh jaxson-build` times out: the ngrok TCP address rotated. Ask the user for the
  current host/port and update the `jaxson-build` block in `~/.ssh/config`. The key still
  works at the new address.
- Simulators need a logged-in console session on the Mac; headless compiles are fine.

---

## 1. WHAT THIS PROJECT IS AND WHAT WE WERE FIXING

An Expo/React-Native + Convex self-help immigration app (Immifile) that prepares USCIS
**Form I-765** (work permit) and **Form I-90** (green card replacement/renewal).

A prior audit found the app would declare an application "ready" and export a
"print-ready filing package" that was in fact missing most required USCIS fields, had no
eligibility screening, no real answer review, and no filed lifecycle. This session
executed the repair in ordered safety slices.

**Definition of done for the overall repair:** every offered path either produces a
verified, current-edition filing package or clearly stops and explains why it is
unsupported; "ready" and clean export require all applicable answers + documents; users
can review/correct/export/mark-filed/link a case; the vault, reminders, recovery, and
retention support real multi-day use; tests cover workflow truth.

---

## 2. WHAT SHIPPED THIS SESSION (8 commits, all pushed)

| Commit | What |
|---|---|
| `1602d04` | **Server-owned readiness contract** + fail-closed clean export |
| `cee6fc7` | **Eligibility pre-screening** + verified I-90 status mapping |
| `8cde2b4` | Identity + contact field contracts (both forms) |
| `fcb4f7f` | I-90 biographic + admission contract |
| `9f53734` | **I-90 contract COMPLETE — clean export unlocks** |
| `e8c52b5` | **Answer-review screen** with edit-jump + in-app inspection |
| `2068dc5` | I-765 Other Information + statement; **SSN never storable** |
| `e7f3de9` | **I-765 contract COMPLETE — clean export unlocks** |

**Net result: BOTH form contracts are complete.** `I765_COVERAGE_GAPS` and
`I90_COVERAGE_GAPS` are both `[]`, so a fully answered application with resolved
documents genuinely reaches `isReadyToFile: true` and can export a clean PDF. Milestone
tests prove this end-to-end through the real mutations for both forms.

---

## 3. LOAD-BEARING ARCHITECTURE (understand before changing anything)

### `convex/shared/readiness.ts` — the export gate
`computeReadiness({formType, applicationKind, answers, requirements})` returns
`{answersComplete, documentsComplete, formCoverageComplete, isReadyToFile, blockers[]}`.
Blocker kinds: `answers` (re-derived per step, never trusts stored `stepCompletion`
flags), `document` (slots still `needed`), `coverage` (form-wide items the app cannot
produce — now empty for both forms). Returned by `getApplication`; every surface reads
this one truth. **Nothing may claim "ready" except this.**

### `convex/shared/interviewValidation.ts` — completeness + applicability predicates
`stepOwnedKeys` (which draft keys each step owns — the save clears these before merging,
so a cleared optional actually disappears) and `isStepComplete(formType, kind, stepKey,
answers)`. The conditional rules were **extracted into exported predicates**
(`aNumberRequired`, `physicalAddressApplies`, `physicalAddressComplete`,
`physicalAddressUsComplete`, `immigrantVisaDetailsApply`, `previousNameApplies`,
`replacementReasonApplies`, `accommodationDetailsApply`, `otherNamesApply`,
`travelDocDetailsApply`, `c26ReceiptApplies`, `c8QuestionApplies`) that **both**
`isStepComplete` and the review model call — this is the anti-drift keystone.

### `convex/shared/reviewModel.ts` — what the review screen renders
`buildReviewModel(formType, kind, answers)` derives groups (from `preReviewStepKeys`),
rows (from `stepOwnedKeys`), `group.complete` (**verbatim** `isStepComplete`), documents
(from `requiredSlotKeys`), and per-row status (`ok | missing | invalid | optional-blank |
blocked`). A **69-case drift-guard test** pins:
`group.complete === isStepComplete === !readiness-answers-blocker === (all rows clean && no blocker)`.
**If you add a field, this test will tell you if your applicability logic drifted.**

### `convex/shared/screening.ts` — eligibility boundary
`screenI90(cardStatus, kind)` blocks exactly one combination (conditional resident +
renewal → I-751/I-829). `supportedI765Categories` is the explicit 8-category list;
`notListed` can never complete a step. Enforced server-side in `createApplication`, the
single choke point every start flow uses.

### `convex/shared/interviewSteps.ts` — blueprints + answer-aware documents
i765 = 12 keys, i90 = 12 keys (incl. `review`). `requiredSlotKeys(formType, kind,
answers)` is **answer-aware**: an I-90 legal name change adds `nameChangeEvidence`; an
I-765 (c)(8) "yes" adds `courtDispositions`. `reconcileRequirements` loads the draft and
reconciles on every save (adds/removes `needed` slots; never discards attachments).

### PDF maps — `pdf.i765-map.ts` / `pdf.i90-map.ts`
Every field was verified against the bundled template's own `TU` tooltips + checkbox
export values + widget geometry. **The internal field names lie.** Documented traps:
- I-765 `Line9_Checkbox` = Item 10 **SEX**; `Line10_Checkbox` = Item 11 **MARITAL STATUS**
- I-765 `Line17a/17b_CountryOfBirth` = Item 14 **CITIZENSHIP**
- I-765 `Line3a/b/c_*` other-name rows: **`[1]` is printed Item 3, `[0]` is Item 4** (swapped)
- I-90 `P3_Line9_HeightInches1/2/3` = **WEIGHT** digits
- I-90 eye/hair (`P3_checkbox10/11`) and reason (`P2_checkbox2`) indices do **not** follow printed order
All are pinned by literal-path tests. **Never renumber these from the printed form.**

Clean export **fails closed**: `renderFilingPackage` throws if any fill op misses;
the watermarked draft preview stays fail-open.

### Review screen — `src/screens/applications/review/`
Route `/application/:id/review`. Grouped cards per interview question, complete /
needs-attention chip, per-row values, blocker sentences, documents checklist, coverage
notice. Each group's **Edit** pushes `/interview/:id?stepKey=X&mode=single`; the interview
opens at that step and `router.back()`s to review on save (live Convex query refreshes the
summary). Full-wizard behavior is unchanged when `singleStep` is undefined.

---

## 4. OWNER DECISIONS ALREADY MADE — DO NOT RE-LITIGATE

- **SSN: skip it.** Owner chose this explicitly. The I-765 Item 13 SSN is optional ("if
  known") and this edition has **no SSA card-request/consent/parents items at all**. So:
  `ssn` is **removed from `i765SpecificsShape`** (the storage validator rejects one),
  `buildI765Ops` never writes Item 13, and a test forces an SSN into a draft to prove no
  op can target that box. The interview discloses the box is left blank and how to
  request an SSA card on the printed form. **Do not add SSN collection.**
- Supported situations remain the five: I-765 initial/renewal/replacement, I-90
  renewal/replacement. Supported I-765 categories remain the eight in `screening.ts`.
- The app is free; USCIS filing fees are informational only and never collected.

---

## 5. EXACT NEXT ACTION — the last P0: application filed lifecycle

`convex/applications.ts` currently exports **only** `createApplication`,
`listApplications`, `getApplication`, `saveApplicationStep`. There is **no way to mark an
application filed, close it, or delete it**, so "Completed" applications, filed-date
renewal history, the filed Journey Hub state, and normal case linkage are only reachable
via seeded/manual DB state. `convex/cases.ts` inserts a case but never transitions the
linked application.

Build:
1. An explicit user-confirmed **"I filed this with USCIS"** transition with a filing date
   (`status: 'draft' -> 'filed'`, set `filedAt`). Gate it on `readiness.isReadyToFile`
   (or at minimum warn honestly if not ready — do not silently allow a false filed state).
2. **Case reconciliation**: creating/linking a receipt-number case should transition its
   application to `filed` idempotently. `cases.new.tsx` says "Link a filed application"
   but lists all applications — fix that too.
3. Filed applications must still be able to **re-download their package**; define a clear
   correction/reopen policy.
4. **Close/archive/delete** for abandoned or mistakenly created drafts, so they stop
   creating permanent false attention items on Home.

Note the schema already has `filedAt` / `closedAt` fields and `applicationStatuses =
['draft','filed','closed']`, and the dev seed already creates filed/closed rows — so the
data model is ready; the mutations and UI are what's missing.

---

## 6. BACKLOG AFTER THAT (handoff's original order)

- **P1 documents**: `convex/documents.ts` attach rule only checks owner — it does **not**
  validate document type vs requirement. "Use saved" offers every document regardless of
  type. Add type-compatibility + freshness.
- **P1 vault**: rows aren't pressable, no preview/replace/delete/expiry capture;
  `uploadNewVersion` exists in the backend with no UI.
- **P1 extraction autofill**: needs owner approval before any paid OCR provider.
- **P1 reminders**: preference is device-only SecureStore + local notifications; a new
  phone loses them though the UI implies otherwise. Needs server-side intent + reconcile.
- **P1 recovery**: no forgot-password flow; dependents have no management surface.
- **P1 retention**: anonymous accounts + all work are hard-deleted after 48h, which
  conflicts with a multi-day filing workflow. Gate the first sensitive upload behind a
  recoverable account and warn earlier.

---

## 7. VERIFICATION EVIDENCE

- `bun run test:once` → **27 files, 573 tests passing**
- `bun run typecheck` → clean
- `bunx eslint <changed>` → clean
- Both `I765_COVERAGE_GAPS` and `I90_COVERAGE_GAPS` are `[]`
- Milestone tests exist for both forms asserting `isReadyToFile === true` end-to-end

**NOT verified: live simulator rendering.** No booted sim was available (needs a
logged-in console GUI session on the Mac). The review screen and both interviews have
never been visually walked through. A sim QA pass is genuinely owed — the logic is
heavily unit-tested but the rendering and navigation are not.

---

## 8. LESSONS / GOTCHAS FROM THIS SESSION

1. **Batch text-patches silently no-op.** Python `str.replace` patches against
   prettier-reformatted source failed silently twice, shipping half-applied edits into the
   working tree. **Always `assert old in s` before replacing, and grep-verify markers
   after a batch.** One no-op was caught by tests, one only by a marker audit.
2. **The audit doc was wrong more than once.** It guessed at field semantics that the
   template's tooltips contradicted (Sex/Marital vs SSN; the whole "SSA card-request
   block" that doesn't exist). **Always dump the AcroForm and read the `TU` tooltips +
   export values before mapping anything.** Recipe:
   ```bash
   ssh jaxson-build 'export PATH=/usr/local/bin:$PATH && cd ~/develop/expo_immigration_app \
     && cat > d.mjs << "EOF"
   import { readFileSync } from "node:fs"
   import { PDFDocument, PDFName, PDFString, PDFHexString } from "pdf-lib"
   const doc = await PDFDocument.load(readFileSync("assets/forms/i-765.pdf"), { ignoreEncryption: true })
   for (const f of doc.getForm().getFields()) {
     const tu = f.acroField.dict.get(PDFName.of("TU"))
     const t = tu instanceof PDFString || tu instanceof PDFHexString ? tu.decodeText() : ""
     const on = f.acroField.getWidgets().map(w => w.getOnValue?.()?.decodeText?.()).filter(Boolean)
     console.log(JSON.stringify({ n: f.getName(), on: on.length?on:undefined, t }))
   }
   EOF
   node d.mjs; rm d.mjs'
   ```
   (must run from the repo cwd so `pdf-lib` resolves; `/tmp` fails)
3. **Adversarial review earns its keep.** A multi-lens review caught a CRITICAL swapped
   field index in the I-765 other-names rows that 572 passing tests missed (my tests only
   covered the 0-row and 1-row cases). Run a real review before anything that unlocks
   export.
4. Official instructions are fetchable on the Mac (`curl` with a browser UA; USCIS 403s
   plain fetchers) and readable with `pypdf` — use them to ground required-vs-optional
   rather than guessing.
5. Convex codegen on the Mac regenerates `_generated/api.d.ts` automatically when you add
   a `convex/shared/*` module.

---

## 9. CONSTRAINTS TO PRESERVE

- Information-only self-help positioning; no legal advice or approval guarantees.
- Applicant vs account holder are separate concepts; the applicant profile is the only
  conduit for reusable autofill between applications.
- Explicit Next-save semantics — **no uncontrolled autosave**. The review screen is
  strictly read-only (it calls `saveApplicationStep` zero times).
- One application is the product unit; a case begins after filing.
- Owner-scoped Convex authorization everywhere.
- **Do not guess USCIS checkbox mappings or eligibility rules.** If official requirements
  can't safely support a path, restrict it and explain honestly.
- Do not collect sensitive fields without a defined storage/retention/display/redaction
  behavior (this is why SSN is out).
