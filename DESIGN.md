# Design System — Immigration App

> Canonical design source of truth. Read this before any visual or UI decision.
> **2026-06-28 — pivoted to "Modern iOS / Liquid Glass"** (user-approved, verified on the iPhone 17 / iOS 26.5 simulator). Supersedes the prior warm-paper / calm-civic direction. Component-level patterns: `docs/design/`. Token source of truth in code: `apps/mobile/src/features/ui/tokens.ts` + `apps/mobile/src/global.css`.

## Product Context
- **What this is:** all-in-one US/USCIS immigration app. v1 = guided **I-765/EAD renewal** spine (auth → reusable profile → document vault → filing wizard → case tracker → calendar/reminders). Forum + news are v1.1.
- **Who it's for:** immigrants renewing work authorization/status. Often non-native English, anxious, infrequent use.
- **Space:** immigration / civic tech, high-stakes personal data.
- **Project type:** native mobile app (Expo SDK 56 + HeroUI Native Pro + Uniwind), iOS + Android.

## Memorable thing
A modern, **tactile iOS app that feels premium and trustworthy** — translucent liquid glass over a calm atmosphere. Glass for depth and delight, never flashy; legibility and calm always win over spectacle.

## Aesthetic Direction
- **Direction:** Modern iOS / **Liquid Glass**.
- **Surfaces:** translucent, frosted **glass cards** (real backdrop blur) that float over an atmospheric gradient backdrop. Native iOS 26 chrome (tab bar, sheets, headers) renders as system Liquid Glass for free via `NativeTabs`.
- **Depth:** layered translucency + soft, cool drop shadows + 1px glass hairline borders for edge definition on busy backgrounds.
- **Mood:** calm, competent, modern. Lowers blood pressure during stressful paperwork while feeling like a 2026 iPhone app.

## Typography
- **Display / large titles: Fraunces** (warm humanist serif) — identity + warmth, prevents a generic-template feel. iOS-style large titles at 34/40, headlines 27.
- **Body / UI / labels / numbers: DM Sans** (humanist sans, legible for anxious / non-native readers). `tabular-nums` on all numeric values (days-left, dates, receipts).
- **Loading (Expo):** `@expo-google-fonts/fraunces` + `@expo-google-fonts/dm-sans` via `useFonts`. Weights: Fraunces 500/600 (display only); DM Sans 400/500/600/700.
- **Scale (px / weight):** large title 34/600 (Fraunces) · headline 27/600 (Fraunces) · card title 16–17/600 · body 15/400 · caption 13/400 · micro 12. Everything below headline is DM Sans.

## Color (cool, glass-ready)
- **Backdrop:** cool light base `#EEF2F8` with an **atmospheric wash** — blue pooling top-left, a soft violet accent upper-right, teal pooling bottom-right (low opacity, calm). This is what the glass refracts.
- **Glass surface:** translucent white (`rgba(255,255,255,0.55–0.72)`) over a backdrop blur; hairline border `rgba(255,255,255,0.55)`.
- **Primary text:** cool near-black `#161A22`. **Muted:** `#5A6373`. **Hint:** `#8B94A4`.
- **Accent:** modern iOS blue `#1366D6` — primary buttons, links, selected/active states.
- **Semantic (vibrant, iOS-leaning):** success `#1E874B` (dot `#34C759`) · warning `#A65A0B` (dot `#FF9F0A`) · danger `#D23344`. Status color is meaningful, never decorative.
- **Dark mode:** cool near-black base (`hsl 222 30% 8%`), white-alpha glass surfaces, brighter accent (`hsl 212 96% 62%`); WCAG AA in both modes. Light is primary for v1.

## Glass System (code primitives)
- **`ScreenBackground`** (`features/ui/glass.tsx`): the atmospheric backdrop (base + layered `expo-linear-gradient` washes). Rendered behind every `Screen`.
- **`GlassCard`** (`features/ui/glass.tsx`): `expo-blur` `BlurView` (tint `light`, intensity ~32–40) under a translucent tint, inside an `overflow:hidden` clip with a hairline border; soft shadow on an **outer** wrapper so the clip doesn't swallow it. Props: `intensity`, `padding`, `elevated`. Use for every prominent surface; prefer it over heroui `Card`.
- **Native chrome:** `NativeTabs` tab bar = system Liquid Glass on iOS 26 / native blur on iOS ≤18. Sheets and headers via native stacks.
- Glass intensity is **globally tunable** from the token + `GlassCard` layer — calibrating it never requires per-screen edits.

## Spacing & Layout
- **Grid:** 8px base (4px half-steps). Screen padding 20. Section gap 18–24. Prefer flex `gap`.
- **Density:** comfortable-to-spacious. Never cramped.
- **Radius:** cards/glass 22 · inputs/fields 14 · pills/chips full. Always `borderCurve: "continuous"`.
- **Layout:** single column, full-width glass cards within 20px gutters, iOS large title at top, native bottom tab bar. One focal point per screen.

## Motion
- Intentional, gentle. Enter ease-out `cubic-bezier(0.16,1,0.3,1)`, exit ease-in. Durations: micro 100 · short 150 · medium 250 · long 400ms. Animate transform/opacity only. Respect reduced-motion.

## Accessibility (load-bearing on glass)
- **Text on glass must use high-contrast foreground tokens** (dark text on light glass). Never rely on translucency that drops contrast below AA.
- Glass surfaces over busy backgrounds get a **semi-transparent hairline border** for definition.
- Secondary/subtitle text over gradients uses partial transparency so it blends without becoming a hard opaque block.
- Form fields keep a more opaque fill (`field-background` ~0.85 alpha) so input text stays legible on glass.
- Error/status text uses `accessibilityRole="alert"` + `accessibilityLiveRegion="polite"`.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-22 | Initial system: warm paper + Fraunces + DM Sans | "calm, human, not a gov form" (from Mobbin board) |
| 2026-06-28 | **Pivot to Modern iOS / Liquid Glass** | User direction: "modern iphone app … liquid glass." Translucent glass surfaces over a cool atmosphere, native iOS 26 glass chrome; kept Fraunces+DM Sans for identity. Verified on iPhone 17 / iOS 26.5. |
| 2026-06-28 | Keep current glass intensity (tasteful, not maximal) | User-confirmed on sign-in + Home; legibility/calm prioritized over spectacle. Globally tunable via tokens. |
