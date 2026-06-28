# Decision Log

> Single source of truth for product/tech decisions. Newest context wins; supersede explicitly.

| # | Decision | Choice | Date | Rationale |
|---|----------|--------|------|-----------|
| D1 | Immigration system | **US / USCIS** | 2026-06-22 | Largest market; public case-status + news; research baseline |
| D2 | v1 filing scope | **I-765 / EAD renewal ONLY** (I-90 deferred, stays in schema) | 2026-06-22 | I-90's ~10-yr cadence can't prove a 12-mo retention thesis; I-765 renews every 1–2 yrs. Halves legal/accuracy cost |
| D3 | North-star metric | **Retention** (≥25% start a 2nd filing within 12 mo — hypothesis; cohort = I-765 renewers) | 2026-06-22 | Tests the core thesis; refine after cohort 1 |
| D4 | Business model | **Free for now** (monetization hypothesis owed) | 2026-06-22 | Prove the retention loop first; a written money theory is still required (panel) |
| D5 | Backend host | **Railway** (Postgres + Hono + Drizzle `pg`) | 2026-06-22 | User choice; verified Drizzle+Railway path |
| D6 | Auth | **Better Auth (self-hosted)** | 2026-06-22 | Own the PII; Expo support |
| D7 | PII custody (v1) | **Metadata-only vault** (no document files yet) + **encrypt structured PII** (name, DOB, country, A-number, phone, address, family — not just A-number) | 2026-06-22 | Lowest liability that still powers reminders; structured PII is the real breach/subpoena payload. Confirm with counsel |
| D8 | "Submit" semantics | **Export a user-verified PDF the user files themselves** (activation = PDF exported) | 2026-06-22 | No third-party USCIS submission API; programmatic filing = preparer/UPL |
| D9 | Case tracker | **Manual-first** (receipt entry); live USCIS sync only if Phase-0 go/no-go returns GO | 2026-06-22 | No reliable real-time consumer case-status API expected |
| D10 | Repo structure | **Monorepo** — `apps/mobile`, `apps/server`, `packages/shared` (shared Zod types) | 2026-06-22 | Phases 1+2 build in parallel and must share types; pulled forward to Phase 0 (panel) |
| D11 | Localization | Install **i18n + string externalization now**; ship **en + es** at launch | 2026-06-22 | Audience is often non-native English; retrofitting is far costlier. Legal-copy translation is an accuracy (attorney) task, not a localization checkbox |
| D12 | Sequencing | **Phase 0 de-risking before build**; user-validation sprint recommended before full commit | 2026-06-22 | Gate not met (Phase 1 review); resolve existential unknowns first |
| D13 | Forum + news | Schema stays; **build deferred to v1.1** | 2026-06-22 | Validate the filing→track→retain loop first |
| D14 | I-765 form edition | **08/21/25** (current accepted edition; supersedes the spike's unverified 03/13/26) | 2026-06-28 | Verified 2026-06-28 against the live USCIS PDF (footer 08/21/25, OMB 1615-0040, exp 08/31/2027). Edition is a config value (`I765_FORM_EDITION`), re-verified per release |
| D15 | I-765 PDF generation | **On-device** — pdf-lib fills the bundled *decrypted* official AcroForm, flattened (XFA dropped); inline WebView preview + Print + Save/Share | 2026-06-28 | Keeps all PII on-device (reinforces D7/D8); pure-JS pdf-lib runs in Hermes; a flattened print is exactly what paper filers mail |

## Open decisions (need you / counsel)

- [ ] Government-data-request / threat-model policy for DACA/asylum/TPS users (subpoena/ICE posture; whether to log `audit_log.ip` at all). **Gates PII storage.**
- [ ] Legal entity + E&O (professional-liability) insurance posture before any wizard code.
- [ ] Monetization hypothesis (even while free): e.g., paid pre-submit expert review, or B2B sponsored seats (universities / legal-aid).
- [ ] Product name.

## Phase 0 outcomes (2026-06-22 — see `docs/spikes/`)

- **USCIS API: NO-GO for v1** (D9 confirmed). Org-vetted/representational, weeks-to-months onboarding. Tracker is manual-first behind a `CaseStatusProvider` seam; pursue org onboarding as v1.x/v2, never a v1 blocker.
- **PII encryption (D7 detailed):** app-layer AES-256-GCM over the full re-identifying set; **external KMS + per-user keys** (not pgcrypto-in-DATABASE_URL); HMAC blind-index for `receipt_number`; metadata-only vault; **crypto-shredding** for erasure; short-TTL IP; never collect SSN; lazy PII collection; pseudonymous forum.
- **I-765 current accepted edition is 08/21/25** (verified 2026-06-28 against the live PDF; the earlier 03/13/26 note was an unverified guess, now superseded — see D14). Print the edition on every exported page; re-verify per release. Field map + mechanical/legal-judgment split in `docs/spikes/i765-form-mapping.md`; the extracted AcroForm field→item reference is in `docs/spikes/i765-fields-tu.json`.
- **Version matrix: YELLOW** — core SDK 56 stack GREEN; risks = `heroui-native-pro` beta.5 + `react-native-skia` transitive-only. Clear to GREEN with a physical-device EAS dev build.

*See `docs/PHASE-1-REVIEW.md` for the reasoning behind D2/D7/D8/D9/D12 and `docs/spikes/` for Phase-0 findings.*
