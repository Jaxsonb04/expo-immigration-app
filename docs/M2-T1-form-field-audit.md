# M2-T1 Form Field Audit — I-765 & I-90

Status: DONE (audit only; remediation is M2-T2). Date: 2026-07-06.

Compares every field the supported I-765/I-90 flows touch against the three
required axes — **interview source** (a step that collects it),
**validation rule** (a `fieldValidators` / Zod constraint), and
**PDF destination** (a `buildI*Ops` mapping) — and against the **bundled USCIS
editions** to surface fields the flow ignores entirely.

## Sources of truth

| Axis | File |
| --- | --- |
| Interview steps + step→data slices | `src/screens/interview/interview.form.ts`, `convex/shared/interviewSteps.ts` |
| Validation rules | `interview.form.ts` `fieldValidators`; shapes in `convex/shared/applicationShapes.ts` |
| PDF destinations | `src/screens/applications/journey-hub/pdf/pdf.i765-map.ts`, `pdf.i90-map.ts` (+ `pdf.fill.ts`) |
| USCIS field inventory | `assets/forms/i-765.pdf` (ed. 2025-08-26, **161 AcroForm fields**), `assets/forms/i-90.pdf` (ed. 2025-02-27, **195 fields**) — dumped via `pdf-lib` |

**Method.** The bundled AcroForm field names were enumerated directly from the
two PDFs and cross-referenced with the maps. USCIS-required judgments below
follow the printed form + standard filing requirements and are flagged
`[confirm]` where they must be checked against the official form instructions
before M2-T2 locks scope.

Legend: ✅ all three axes present · ⚠️ partial (see note) · ❌ missing an axis.

---

## A. Data-model fields the flow already knows about

These are declared in `applicationShapes.ts` and threaded through the interview.

### Shared person facts (both forms)

| Field | Interview source | Validation | PDF dest (I-765 / I-90) | Status |
| --- | --- | --- | --- | --- |
| givenName | `legal-name` | `personFactsShape.givenName` (min 1) | `Line1b_GivenName` / `P1_Line3b_GivenName` | ✅ |
| middleName | `legal-name` | optional | `Line1c_MiddleName` / `P1_Line3c_MiddleName` | ✅ (optional) |
| familyName | `legal-name` | `familyName` (min 1) | `Line1a_FamilyName` / `P1_Line3a_FamilyName` | ✅ |
| dateOfBirth | `date-of-birth` | ISO date | `Line19_DOB` / `P1_Line9_DateOfBirth` | ✅ |
| countryOfBirth | `country-of-birth` | min 1 | `Line18c_CountryOfBirth` / `P1_Line11_CountryofBirth` | ✅ |
| aNumber | `a-number` | `^\d{7,9}$` (optional for I-765 initial) | `Line7_AlienNumber` / `P1_Line1_AlienNumber` | ✅ |
| mailingAddress.{street,city,state,zipCode} | `mailing-address` | `addressShape` | full address block on both | ✅ |
| mailingAddress.unit | `mailing-address` | optional | Unit type+number combs on both | ✅ |
| eligibilityCategory (I-765) | `eligibility-category` | min 1 (`Choose your category`) | `#area[1].section_1/section_2` (letter/number) | ✅ |

### Form-specific answers — **collected but with a broken axis**

| Field | Interview source | Validation | PDF dest | Status |
| --- | --- | --- | --- | --- |
| I-765 `form.ssn` | ❌ **none** (no step) | none | ✅ `Line12b_SSN` | ⚠️ **mapped but unfillable** — the PDF field is wired but nothing ever collects an SSN. |
| I-765 `form.previousEadCardNumber` | ❌ none | none | ❌ deliberately unmapped | ❌ dead field — no source, no destination. |
| I-765 `form.replacementReason` | `eligibility-category` (replacement only) | min 1 when replacement | ❌ deliberately unmapped | ⚠️ **collected, never written** — the "what happened to your card" answer is lost. |
| I-90 `form.cardExpirationDate` | `card-details` | optional ISO date | ❌ unmapped ("no field on edition") | ⚠️ collected, never written. `[confirm]` — I-90 does have a card-info area; re-verify. |
| I-90 `form.replacementReason` | `card-details` (replacement only) | min 1 when replacement | ❌ unmapped (P2 checkboxes not ordered) | ⚠️ collected, never written — **and see B: the whole I-90 reason block is unmapped.** |

---

## B. USCIS fields the flow does NOT know about (no source, no validation, and mostly unmapped)

Enumerated from the bundled PDFs. `[req]` = required for a valid filing per the
printed form; `[req?]` = required, confirm against instructions.

### I-765 (2025-08-26) — Part 2 "Information About You" + Part 3

| Printed item | AcroForm field | Notes |
| --- | --- | --- |
| Country(ies) of citizenship/nationality `[req]` | `Line17a_CountryOfBirth` / `Line17b_...` (misnamed — really **citizenship**, per the map's own comment) | **Not collected.** Distinct from country of birth. Defensible: the map author verified this is citizenship. |
| City/town of birth `[req]` | `Line18a_CityTownOfBirth` (explicit name) | Not collected. |
| Part 3 Daytime phone `[req]` | `Pt3Line3_DaytimePhoneNumber1` (explicit name) | Not collected. |
| Part 3 Email `[req?]` | `Pt3Line5_Email` (explicit name) | Not collected. |
| Part 3 Applicant signature + date `[req]` | `Pt3Line7a_Signature`, `Pt3Line7b_DateofSignature` (explicit) | Wet-sign on print is acceptable, but flag in filing instructions. |
| SSN Y/N + SSN-card consent `[confirm]` | `Line9_Checkbox[0/1]`, `Line10_Checkbox[0..3]` | Present, not collected. **Semantics inferred** — I-765's internal `LineNN` names don't track printed items (see map warning), so confirm which checkbox is which before wiring. |
| In-care-of name / Other names used | `Line4a_InCareofName`, `Line2a/2b/2c_*` | Optional. |
| Additional info (passport/travel doc, I-94, recent entry, SEVIS, etc.) | `Line20d_*`, `Line30a_ReceiptNumber`, `PtLine29/30b_YesNo` | Situation-dependent; largely N/A for C-category renewals, needed for some initials. `[confirm]` per category and printed-item semantics. |

> **Gender:** unlike I-90, the I-765 AcroForm exposes no self-named gender field,
> and its generic `LineNN_Checkbox` names can't be trusted to printed items. Do
> **not** assume I-765 collects gender — confirm against the instructions before
> adding it as a gap.

### I-90 (2025-02-27) — larger gap surface

| Printed item | AcroForm field | Notes |
| --- | --- | --- |
| **Part 2 Item 1 Application type (reason)** `[req]` | `P2_checkbox1[0..2]` | **Entirely unmapped. The generated I-90 currently indicates NO reason at all** — renewal vs replacement is invisible on the produced form. Highest-priority gap. |
| **Part 2 Item 2 Reason sub-detail** `[req]` | `P2_checkbox2[0..11]` (a1–a4 renewal, b1–b3 replacement) | Unmapped. `form.replacementReason` is collected but has nowhere to go. |
| Gender (Item 8) `[req]` | `P1_Line8_male` / `P1_Line8_female` | Not collected. |
| City/town of birth (Item 10) `[req]` | `P1_Line10_CityTownOfBirth` | Not collected. |
| Mother's given name (Item 12) `[req]` | `P1_Line12_MotherGivenName` | Not collected. |
| Father's given name (Item 13) `[req]` | `P1_Line13_FatherGivenName` | Not collected. |
| Class of admission (Item 14) `[req?]` | `P1_Line14_ClassOfAdmission` | Not collected. |
| Date of admission (Item 15) | `P1_Line15_DateOfAdmission` | Not collected. |
| SSN (Item 16) | `P1_Line16_SSN` | Not collected/mapped. |
| Biometrics — height, weight, eye color, hair color, ethnicity/race (Part 3) `[req]` | `P3_Line8_HeightFeet/Inches`, weight, `P3_checkbox4/5`, `P2_checkbox3[*]` | **None collected.** Required on I-90. |
| Signature + phone + email | Part 2 signature/contact fields | Wet-sign on print; typed phone/email needed. |
| USCIS online account # (Item 2) | `P1_Line2_AcctIdentifier` | Optional. |

---

## C. Per-situation coverage summary

"Fileable" = every `[req]` field above has all three axes. None of the five are
currently fileable end-to-end; identity/address/DOB are solid across all.

| Situation | Solid today | Blocking `[req]` gaps |
| --- | --- | --- |
| I-765 initial | name, DOB, country of birth, address, reason checkbox, eligibility | citizenship, city of birth, phone/email, signature (+ SSN questions `[confirm]`) |
| I-765 renewal | same + A-Number | same as initial (minus initial-only additional-info items) |
| I-765 replacement | same | same, **plus** replacementReason has no PDF destination |
| I-90 renewal | name, A-Number, address, DOB, country of birth | **application type/reason (Item 1) unmapped**, gender, city of birth, mother/father names, biometrics, class of admission |
| I-90 replacement | same | same as I-90 renewal **plus** reason sub-detail (Item 2) unmapped |

---

## D. Recommendations for M2-T2 (prioritized)

1. **I-90 application-type/reason mapping (P0).** Visually verify `P2_checkbox1`
   (Item 1) and `P2_checkbox2` (Item 2) widget geometry — as the I-90 map warns,
   they can't be safely ordered blind — then map `applicationKind` → Item 1 and
   `form.replacementReason` → Item 2. Without this the I-90 is not a valid filing.
2. **Add the missing required person facts to `personFactsShape` + interview
   steps + validators + both maps:** country of citizenship (I-765), city/town of
   birth (both), gender (I-90 confirmed via `P1_Line8_male/female`; `[confirm]`
   for I-765). These are cross-cutting `[req]` identity fields.
3. **I-90-only required facts:** mother's & father's given names, biometrics
   (height, weight, eye color, hair color, race/ethnicity), class of admission.
   Add a dedicated I-90 interview step group.
4. **SSN:** either collect it (new step + Item 9 Y/N gate on I-765; SSN privacy
   handling — do NOT persist beyond the draft, mirror the assistant secret
   discipline) or remove the dead `Line12b_SSN` mapping. Decide per privacy
   review. Map I-765 `form.replacementReason` if the edition exposes a reason
   sub-field; otherwise document it as intentionally instructions-only.
5. **Contact + signature:** collect daytime phone (+ email) for both; add a
   filing-instructions note that the printed package must be wet-signed and
   dated (Part 3 / Part 2 signature).
6. **Resolve the "collected but unwritten" fields:** `previousEadCardNumber`
   (remove or wire), `cardExpirationDate` (re-verify the I-90 card-info area).

## E. Open questions (resolve before M2-T2 scope-locks)

- `[confirm]` the `[req]`/`[req?]` calls above against the official I-765 and
  I-90 instruction PDFs (not just field presence).
- SSN & biometrics raise data-sensitivity questions — confirm the privacy/storage
  policy (ADR needed) before collecting.
- Signature strategy: typed vs. wet-sign-on-print for the print-ready package.

---

**Update 2026-07-07:** Part 2 **Item 2** (renewal/replacement reason,
`P2_checkbox2[*]`) is now MAPPED — see `src/screens/applications/journey-hub/pdf/pdf.i90-map.ts`
(renewal→2f/[1]; lost/stolen→2a/[5]; damaged→2c/[7]; error→2d/[4];
nameChange→2e/[0]), with exactly-one-box regression tests in `pdf.fill.test.ts`.
The "highest-priority gap" language above is historical. Part 2 **Item 1**
(status: LPR / commuter / conditional) remains deliberately unmapped — the
interview does not collect status, and defaulting to 1.a would mis-file
commuter/conditional residents (see TODO(M2-T2) in the map).

**Update 2026-07-20:** Part 2 **Item 1** is now COLLECTED and MAPPED. The
card status is asked at application creation (new-application pre-screen,
enforced in `createApplication`) and editable on the `card-details` step;
`pdf.i90-map.ts` maps `P2_checkbox1[0/1/2]` = 1.a LPR / 1.b commuter / 1.c
conditional (verified via TU tooltips + export values `1a/1b/1c` + widget
y-geometry). Section B conditional-resident replacement reasons are also
mapped (`P2_checkbox3`: 3.a=[4], 3.c=[1], 3.d=[2], 3.e=[3], export values
`3a`–`3e` — note the shuffled indices), and `buildI90Ops` routes replacement
reasons to Section A or B by status. Conditional-resident RENEWAL is blocked
by deterministic screening (`convex/shared/screening.ts` → I-751/I-829).
Correction to the biometrics row below: `P2_checkbox3[*]` is NOT part of the
Part 3 biometrics family — it is the Section B reason block; the biometrics
gap itself (height/weight/eye/hair/ethnicity/race) still stands.

**Update 2026-07-20 (later): the I-90 field contract is COMPLETE.** Slices
3a-3c closed every remaining I-90 gap this audit catalogued plus items it had
missed: identity/contact (city/state of birth, phone, email), the full
biographic block (gender, parents, class/date of admission, height/weight/
eye/hair/ethnicity/races), Part 1 Item 4 name-changed (+Items 5.A-5.C
previous name, with an answer-aware `nameChangeEvidence` document slot),
Part 1 Item 7 physical address (incl. foreign fields), Part 3 Items 1-5
(locations, entry details, proceedings/I-407 — a "Yes" on Items 4/5 needs a
Part 8 explanation the app doesn't prepare and fail-closes the step), Part 4
accommodations, and Part 5 statement 1.A. `I90_COVERAGE_GAPS` is now empty
(see `convex/shared/readiness.ts` for the deliberately-blank optional items),
so a complete I-90 with resolved documents reaches `isReadyToFile`. The I-765
gaps below (citizenship/city/contact now CLOSED; SSN block, arrival details,
and the Part 3 statement still OPEN) remain the live I-765 ledger.
