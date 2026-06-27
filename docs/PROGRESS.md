# Build Progress — strict phase tracker

> The single source of truth for **where we are in the original 9-phase plan**. We follow this in order. Update the status column as we go.
> Legend: ✅ done · 🟡 partial · 🔲 not started · ⏸️ blocked (external)

## Status vs. the original plan

| Phase | Status | Notes / artifacts |
|------|--------|-------------------|
| **1 — Define product (PRD)** | ✅ done | `docs/PRD.md` + pressure-test `docs/PHASE-1-REVIEW.md`. Gate met. |
| **2 — Design system + Mobbin** | ✅ done | **Finalized 2026-06-22 via `/design-consultation` → canonical [`DESIGN.md`](DESIGN.md)**: Fraunces display + DM Sans body, warm paper base, white rounded cards, near-black primary, blue accent, semantic status. Full reference board + component patterns in `docs/design/`. Screens designed: welcome, home, calendar + the wizard division plan. |
| **3 — Architecture + data model** | ✅ done (out of order) | `docs/ARCHITECTURE.md`, `docs/DATA-MODEL.md` (database-reviewer-approved). |
| **0 — De-risking spikes** *(inserted by Phase-1 review)* | ✅ done (analyzable parts) | `docs/spikes/`: USCIS API **NO-GO**, version matrix **YELLOW**, I-765 mapping, threat-model **GO**. |
| **4 — Dev env + EAS dev build** | 🟡 partial | Done + verified: Bun monorepo restructure, 5-tab nav skeleton, auth stack (`tsc`/lint/`expo export` all green). Remaining: EAS env/secrets config + a real EAS **dev build on a device** (your task). |
| **5 — Backend on Railway** | 🟡 in progress | Railway project `expo_immigration_app` LIVE: **Postgres** + **api** service deployed (Dockerfile + minimal Hono health server) at `https://api-production-0041.up.railway.app`, `DATABASE_URL` wired. Remaining: GitHub auto-deploy connect (your OAuth) + the real API (auth/PII still gated on counsel + KMS). |
| **6 — Build features (per-feature loop)** | 🟡 in progress | Local-data design loop implemented Home-first: design tokens, Home hub, metadata-only Profile/Vault, I-765 wizard shell, manual Tracker, Calendar. I-765 shared schema helpers + local non-PII autosave now cover reason, eligibility category, and review acknowledgement. Manual tracker receipt validation now saves local government-side case summaries without USCIS sync claims. Local-loop acceptance: tests/typecheck/lint/export pass plus `.maestro/filing-wizard.yaml` and `.maestro/tracker-manual-case.yaml` on the iPhone 17 simulator, no real PII persistence, no USCIS submission wording, forum/news deferred. Backend/PII/PDF production wiring remains gated. |
| **7 — Harden (tests/a11y/security/PII)** | 🔲 | |
| **8 — Ship (App Store + Play)** | 🔲 | |
| **9 — Operate & grow** | 🔲 | |

## What we'll do differently

- **Follow the order.** Don't start a later phase until the current one's gate is met (or it's explicitly blocked on an external action, in which case we note ⏸️ and pick the next *unblocked* in-order phase).
- **One decision at a time**, recorded in `docs/DECISIONS.md`.
- This file gets updated at the end of every working step.

## Your external actions (running in parallel — do not block design work)

- ⏳ Engage immigration counsel (UPL/I-765 accuracy) + E&O insurance + legal entity. *(gates Phase 5/6 wizard shipping)*
- ⏳ Register at developer.uscis.gov. *(weeks; not a v1 blocker — tracker is manual-first)*
- ⏳ Apple Developer ($99) + Google Play ($25) accounts; run an EAS dev build on a physical device. *(clears the version-matrix YELLOW)*
- ⏳ Provision external KMS (envelope encryption, per-user keys). *(gates storing real PII)*

*Last updated: 2026-06-27 — Stage 6 filing wizard autosave + manual tracker receipt persistence verified with Maestro simulator QA.*
