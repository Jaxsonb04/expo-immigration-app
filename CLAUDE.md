# Immigration App

All-in-one US/USCIS immigration app (Expo SDK 56 + HeroUI Native Pro + Uniwind, iOS + Android). v1 = guided **I-765/EAD renewal** spine (auth → reusable profile → document vault → filing wizard → case tracker → calendar/reminders). Forum + news are v1.1.

## Design System
Always read `DESIGN.md` before making any visual or UI decision. Direction (2026-06-28): **Modern iOS / Liquid Glass** — translucent frosted `GlassCard` surfaces (`expo-blur`) over a cool atmospheric gradient backdrop (`ScreenBackground`), native iOS 26 glass tab bar via `NativeTabs`. **Fraunces** serif large titles + **DM Sans** body, cool base `#EEF2F8`, near-black `#161A22` text, iOS blue `#1366D6` accent, vibrant green/amber/red status. Glass primitives + tokens live in `apps/mobile/src/features/ui/{glass.tsx,tokens.ts}` + `global.css`; intensity is globally tunable there. Prefer `GlassCard` over heroui `Card`. Do not deviate without explicit user approval. In QA, flag any UI that doesn't match `DESIGN.md`.

## Project docs (read before working)
- `docs/PROGRESS.md` — strict phase tracker. **Follow phases in order.**
- `docs/DECISIONS.md` — decision log.
- `docs/PRD.md` · `docs/DATA-MODEL.md` · `docs/ARCHITECTURE.md` · `docs/IMPLEMENTATION-PLAN.md` · `docs/spikes/`

## Stack notes
- Bun monorepo: `apps/mobile` (Expo app), `apps/server` (Hono backend — built at Phase 5), `packages/shared` (Zod types shared client+server, `@immigration/shared`).
- Gotchas: heroui-native `Typography` exposes `Heading`/`Paragraph`/`Code` (no `Title`). TS 6 deprecates tsconfig `baseUrl`. Push notifications + secure store require an EAS **dev build** (not Expo Go).
