# Immigration App — Product Requirements Document

> Working title: TBD (see Open Questions). US/USCIS, iOS + Android.

## Problem Statement

Immigrants filing **recurring USCIS renewals** — green-card renewal (Form I-90) and work-authorization renewal (Form I-765 / EAD) — juggle four disconnected tools: paid per-form filing wizards, a separate case-status tracker, manual deadline tracking, and scattered community forums. **Nothing remembers their data between filings**, so every renewal restarts from zero. With USCIS removing the EAD auto-extension for renewals filed on/after Oct 30, 2025, and I-90 processing stretching past 8 months, **missing a renewal window now risks a real gap in legal status or work authorization** — yet no single product helps a returning filer do it correctly, on time, and for free.

## Evidence

- **EAD renewals are slow and now timing-critical.** I-765 renewals take ~3–6 months on average in 2025; USCIS recommends filing up to 180 days before expiry; and the automatic 180-day extension was **removed for renewals filed on/after Oct 30, 2025** — a missed window can mean lost work authorization. ([immi-usa](https://www.immi-usa.com/work-permit-renewal/), [USCIS I-9 handbook §5.1](https://www.uscis.gov/i-9-central/form-i-9-resources/handbook-for-employers-m-274/50-automatic-extensions-of-employment-authorization-andor-employment-authorization-documents-eads-in/51-automatic-extensions-based-on-a-timely-filed-application-to-renew-employment-authorization))
- **I-90 waits are long and worsening:** up to 8+ months in 2026 (from ~4 months in 2025), range 6–24 months — long, anxious waits with no proactive guidance. ([CitizenPath](https://citizenpath.com/form-i-90-processing-time/), [Boundless processing times](https://www.boundless.com/immigration-resources/uscis-processing-times))
- **Demand for tracking + community is proven:** Lawfully reports 6M+ registered cases, 200K+ community posts, 3M+ comments — but it is a *tracker/community* app, not a filing tool. ([Lawfully](https://www.lawfully.com/), [Case Tracker](https://www.lawfully.com/case-tracker))
- **Filing is fragmented and paid per-form:** SimpleCitizen ($89/form, family bundles $299–$599), CitizenPath ($99/form, $299 annual membership), Boundless ($1,999+ for marriage GC, *explicitly no application tracking*). None build a reusable profile/document vault across renewals. ([SimpleCitizen](https://www.simplecitizen.com/), [Boundless tech firms](https://blog.myrawealth.com/insights/top-4-immigration-tech-firms))
- **The free incumbent is bare:** myUSCIS shows the last 5 case actions and email/SMS alerts, but features depend on form type and paper-filed cases are often view-only. ([Checking case status](https://www.uscis.gov/tools/checking-your-case-status-online))

## Proposed Solution

One **free-to-prepare** mobile app that combines guided renewal **filing + case tracking + a deadline calendar with proactive reminders + community**, built on a **persistent user profile and document vault** so the *second* filing is near one-tap. v1 deliberately targets the two most recurring, highest-anxiety renewals (I-90 and I-765) rather than complex one-time petitions, because recurrence is what proves the retention thesis. We win where competitors are siloed: filers get filing **and** tracking **and** deadline safety **and** a vault that remembers them — in one place, free to prepare and track, with a single one-time **Service Fee** only to obtain the finished form (see ADR-0011).

## Key Hypothesis

We believe a **persistent profile + document vault that makes renewals near one-tap**, paired with **proactive deadline reminders**, will drive repeat use among immigrants doing recurring USCIS filings.
We'll know we're right when **≥ 25% of activated users return to start a second application or renewal within 12 months** (north-star: retention).

## What We're NOT Building (v1)

- **Legal advice / attorney matching** — UPL (unauthorized practice of law) risk; v1 provides information and form assistance only, with disclaimers. Validate with counsel.
- **Non-US immigration systems** (Canada/IRCC, UK) — multiplies forms, news, and compliance.
- **Complex one-time petitions** (I-130/I-485 family, asylum) — high complexity, low recurrence; defer.
- **Discussion forum & news feed** — deferred to v1.1 (validate the filing+tracking+retention loop first).
- **Subscriptions / recurring billing** — v1 monetizes only via a one-time **Service Fee per filing** to obtain the output (see ADR-0011); no subscription. (Monetization itself is now in scope — this supersedes the earlier "free for now" stance.)
- **Web app** — mobile (iOS + Android) only for v1.

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| **Retention (north-star)** | ≥ 25% start a 2nd application/renewal within 12 mo | Analytics: distinct users with ≥2 applications |
| Activation | ≥ 60% of new accounts complete their 1st filing | Funnel: account → wizard complete |
| Reminder efficacy | ≥ 80% of due deadlines acted on before due date | Deadline acted-on / total due (pre-due) |
| Tracker engagement | ≥ 2 status checks/user/week during pending cases | WAU on tracker screen |
| Repeat-filing speed | 2nd filing ≥ 50% faster than 1st | Time-in-wizard, 1st vs 2nd application |

## Open Questions

- [ ] Product **name** + brand direction (TBD).
- [ ] Can we integrate the **USCIS case-status API** for real-time tracking, or must users enter status manually / via receipt number? (Feasibility spike — [USCIS developer APIs](https://developer.uscis.gov/apis).)
- [ ] How much of the **I-90 / I-765 form logic** do we encode ourselves vs. link out to USCIS online filing? (Defines the depth of the "filing" feature and the UPL boundary.)
- [ ] Document handling: do we **store uploaded documents** (passport, EAD, GC) or only metadata + reminders? (Big PII/compliance lever.)
- [ ] Exact retention target (25% is a hypothesis) — refine after first cohort.

---

## Users & Context

**Primary User**
- **Who**: Lawful permanent residents approaching the 10-year green-card renewal, and EAD holders (adjustment-of-status applicants, asylum-pending, DACA, certain visa categories) who renew employment authorization every 1–2 years. Phone-first, often non-native English speakers, anxious about deadlines and status.
- **Current behavior**: Manually checks myUSCIS/Case Status Online; tracks deadlines in their head or a calendar; pays a lawyer or a per-form tool; asks questions in scattered Facebook/Reddit groups.
- **Trigger**: Their green card or EAD is approaching expiry (the 180-day-before-expiry window), or they receive a USCIS notice.
- **Success state**: Renewal filed correctly and on time, status visible in one place, no lapse in status/work authorization — and next time, it's effortless.

**Job to Be Done**
When my green card or work permit is approaching expiry, I want to file the renewal correctly and on time without paying a lawyer, so I can keep my legal status and stop worrying about deadlines.

**Non-Users (v1)**
First-time or complex family/employment petitioners, asylum seekers needing legal counsel, and immigration attorneys (B2B) — all out of scope for v1. Non-US filers excluded.

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | Capability | Rationale |
|----------|------------|-----------|
| Must | Account + auth (Better Auth) | Identity anchor for a persistent, returning user |
| Must | Reusable applicant profile (personal/address/employment) | Autofills every future filing — the retention engine |
| Must | Document vault (user-owned, reused across filings) | Renewals reuse passport/EAD/GC docs; reminders on expiry |
| Must | Guided filing wizard for **I-90 + I-765** | The recurring, high-anxiety renewals v1 targets |
| Must | Case tracker (receipt #, status, history) | Proven demand (Lawfully); core anxiety reliever |
| Must | Deadline calendar + **push reminders** | The wedge — auto-extension removal makes timing critical |
| Must | Account + data deletion/export | Store-review requirement + GDPR/CCPA |
| Must | Composition & UI Design | HeroUI Native/Pro for the app, follow the /heroui-pro-design-taste skill, use the /react-composition-structure skill for component, file and folder structure |
| Should | Server-driven types | Instead of declaring one-off types in the client, we can infer the types from the Convex schema and use them in the client. [Reference](https://docs.convex.dev/understanding/best-practices/typescript#inferring-types-from-validators) |
| Should | Profile/document autofill across applications | Makes the 2nd filing near one-tap (north-star driver) |
| Should | Document-expiry reminders (passport/EAD/GC) | Drives proactive return visits |
| Could | USCIS case-status API integration | Real-time tracking if feasible (else manual) |
| Could | Multi-language UI | Audience is often non-native English |
| Won't | Forum, news, subscriptions, legal advice, web | Deferred / out of scope (see "NOT Building") |

### MVP Scope

The **retention spine**: account → reusable profile → document vault → I-90 **or** I-765 guided wizard → case tracker → deadline calendar with push reminders → account deletion. Enough to test whether a returning filer comes back for a second renewal.

### User Flow (critical path to value)

1. Sign In, or:
2. Choose a form to file (I-90 or I-765) → quick Personal Information (name, status) → Upload documents → Review and Sign Up/In.
3. Use Better Auth anonymously to sign in and create a profile as we already got user's email and other basic information from the form, so we can backfill the profile with the information from the form.
4. App immediately shows the **deadline** (e.g., "EAD expires in 142 days — file by [date]") → sets reminders.
5. User starts the renewal wizard → PI/vault pre-fills most fields → review → export/submit.
6. User adds the receipt number → tracker shows status + history; reminders continue.
7. Renewal approved → vault updated → next renewal is pre-loaded. (Return loop.)

---

## Technical Approach

**Feasibility**: **HIGH** — verified tooling path (Expo + EAS, Convex, Convex Expo Push notification plugin, Expo push) confirmed against primary vendor docs during research.

**Architecture Notes**
- **Client**: Expo SDK 56 / RN 0.85 / React 19, Expo Router native tabs, HeroUI Native Pro.
- **Backend/API/Storage**: Convex.
- **Form logic**: Tanstack Form with Zod validation.
- **Convex**: For the server runtime, check [Convex Docs](https://docs.convex.dev/functions/runtimes) as some packages might need to switch to node runtime.
- **Decisions & vocabulary**: architecture decisions are recorded in `docs/adr/` (ADR-0001…0009); the project's domain glossary / ubiquitous language is in `CONTEXT.md`.

---

## Phase Details

**Phase 1: Foundations** — Goal: a returning user can sign in and has a profile (preferences) + vault. Scope: Better Auth, `users`/`applicant_profile`/`documents` UI, tabs/stacks, dev build, EAS env. Success: account persists; profile + a document survive re-login.

**Phase 2: Backend core** — Goal:Convex schema, major Convex functions, API. Success: protected endpoint works; a document uploads via signed URL and re-downloads.

**Phase 3: Form Primitives** - Goal: create reusable form primitives that binds HeroUI Native/Pro components with Tanstack Form and Zod validation. Ultilize patterns such as [Form Groups](https://tanstack.com/form/latest/docs/framework/react/guides/form-groups) and [Form Composition](https://tanstack.com/form/latest/docs/framework/react/guides/form-composition), a guide on wrapping with UI lib can be found [here](https://tanstack.com/form/latest/docs/framework/react/guides/ui-libraries).

**Phase 4: Filing wizard** — Goal: complete an I-90 or I-765 renewal end-to-end. Success: a renewal completes with most fields pre-filled from profile with pdf-lib.

**Phase 5: Internationalization** - Goal: internationalize the app to support multiple languages, with expo-localization + react-i18next library, [reference](https://docs.expo.dev/guides/localization/#getting-the-users-language).

**Phase 6: Tracker** — Goal: see case status in one place. Scope: receipt entry, status + history. Success: a case shows current status + history.

**Phase 7: Calendar + reminders** — Goal: never miss a renewal window. Scope: deadlines from documents/cases, calendar UI, Convex cron, [Expo push](https://www.convex.dev/components/push-notifications). Success: a device receives a scheduled due-date reminder.

**Phase 8: Harden + ship** — Goal: safe and in the stores. Scope: 80% coverage, a11y, security/PII review, account deletion, store assets, EAS submit + Update. Success: approved on both stores; OTA channel live.

---

## Decisions Log

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Immigration system | US / USCIS | Canada, UK, multi | Largest market; public case-status + news; research baseline |
| v1 filing journeys | I-90 + I-765 renewals | N-400, I-130, H-1B | Highest recurrence → best fit for retention thesis; timing now critical |
| North-star metric | Retention / repeat use | Activation, engagement, revenue | Directly tests the core thesis |
| Business model | Free to prepare; one-time **Service Fee** per filing to obtain the output | Subscription, freemium, fully free | Pay-for-output matches infrequent filings; preview-before-pay + free tracking preserve trust/retention — see ADR-0011 |
| Filing UX | Question-first **Interview** (answers mapped to form fields behind the scenes) | Replicate raw form fields | Worth paying for; lowers comprehension burden — see ADR-0012 |
| Filing wizard tech | Single TanStack Form instance + per-section `FormGroup`s on one host screen | One form per step; route-per-step | Cross-step state + single submit payload; reuses existing form primitives — see ADR-0013 |
| Localization Library | expo-localization(primitives) + react-i18next | next-intl | User choice; verified expo-localization + i18n library path |
| Backend | Convex | Railway/Hono monorepo (abandoned) | User choice; verified Convex path — see ADR-0001 |
| Auth | Convex Better Auth | None | Owns PII (sensitive immigration data); Expo support — see ADR-0002 |
| Dynamic form storage | Typed discriminated validators on `applications`, keyed by form type | JSONB (not available on Convex) | Convex is a document DB with no JSONB; typed validators preserve server-driven types — see ADR-0005 |

---

## Research Summary

**Market Context** — Filing (SimpleCitizen, CitizenPath, Boundless) and tracking/community (Lawfully, 6M+ cases) are *separate* products; filing is paid per-form; Boundless lacks tracking; myUSCIS is free but bare and form-dependent. **Gap: no one offers free guided renewal filing + tracking + reminders on a reusable profile/document vault.** Renewal timing is now high-stakes (EAD auto-extension removed Oct 30 2025; I-90 at 8+ months in 2026).


*Sources:* [Lawfully](https://www.lawfully.com/) · [SimpleCitizen](https://www.simplecitizen.com/) · [Boundless](https://blog.myrawealth.com/insights/top-4-immigration-tech-firms) · [CitizenPath I-90 times](https://citizenpath.com/form-i-90-processing-time/) · [immi-usa EAD renewal](https://www.immi-usa.com/work-permit-renewal/) · [USCIS case status](https://www.uscis.gov/tools/checking-your-case-status-online) · [USCIS developer APIs](https://developer.uscis.gov/apis)

---