# Fable run notes

One lesson per entry. What worked / what didn't and why. Update entries in
place; delete ones that prove wrong.

## Assistant "misbehaving" — root cause (2026-07-07)

**Summary:** No server-side defect existed in the navigator pipeline; the
live failures were (a) the app running against a Convex dev deployment that
hadn't had the newest functions pushed, and (b) UX dead-ends that read as
"broken".

- Verified layer by layer with a throwaway `convex/diag.ts` action (deleted
  after use): ANTHROPIC_API_KEY valid + funded, `claude-haiku-4-5` resolves,
  `output_config` structured output works, an 8-message extraction battery
  classifies correctly, and multi-turn history merges facts across the
  clarification loop (turn 1 "expires next month" + turn 3 "work permit" →
  supported i765/renewal).
- On first sim launch the app showed a persisted render-error overlay:
  `Could not find public function for community:listPosts` — evidence the
  app had been running while the dev deployment lagged the committed code.
  **Lesson: after committing Convex code, always `npx convex dev --once`;
  the client silently targets whatever was last pushed.**
- The real UX defect: out-of-scope / legal-advice replies dead-ended the
  conversation (deliberately, per an old test asserting
  `suggestions === undefined`). To an anxious filer that reads as "the
  assistant stopped working". Fixed: every out-of-scope reply now keeps the
  attorney referral AND offers tappable supported paths. The safety boundary
  is unaffected — it lives in the deterministic server classifier
  (`convex/shared/navigator.ts`), not in hiding chips.
- Error/retry path verified live by pointing ANTHROPIC_MODEL at a bogus id:
  generic "Something went wrong" bubble + Try again, quota refunded
  (stayed at 7/20). Env restored afterwards.

## Convex env changes don't reach warm Node actions immediately (2026-07-07)

`npx convex env set` propagates to `'use node'` actions only when their
execution environment recycles — warm containers kept serving the old
value for several minutes while a fresh CLI invocation saw the new one.
**Lesson: after changing an env var that a Node action reads, force a
redeploy (`npx convex dev --once`) to recycle containers before trusting
test results.**

## Immifile rename: user-facing only (2026-07-07)

The app's user-facing name becomes **Immifile**; the technical identifiers
stay for now — scheme `immigrationrenewalhelp://`, iOS bundle
`dev.uing.immigrationrenewalhelp`, and the Expo slug — because the scheme is
wired into Better Auth trusted-origins and the Maestro deep links. Renaming
those is a coordinated release-time change, invisible to users.

## Simulator text entry without Maestro inputText (2026-07-07)

Maestro `inputText` crashes the XCUITest driver on iOS 26.5. Workaround that
works: `echo -n "text" | xcrun simctl pbcopy booted`, then Maestro
`longPressOn` the input + `tapOn: "Paste"` + `tapOn: "Send message"`
(accessibility label). Used to drive freeform assistant turns.

## Immifile design system — measured contrast (2026-07-07)

Palette: warm paper ground, one terracotta accent, Fraunces (OFL) display +
Inter (OFL) body — both bundled via @expo-google-fonts (license permits app
redistribution). All tokens in src/global.css; zero hardcoded colors in
components (grep-gated). WCAG ratios computed via oklch→linear-sRGB→relative
luminance (script kept in session scratchpad; re-run on any token change).

| Pairing (text on ground)              | Light   | Dark    | Min |
|---------------------------------------|---------|---------|-----|
| foreground / background               | 14.91:1 | 15.10:1 | 4.5 |
| surface-fg / surface                  | 14.94:1 | 13.00:1 | 4.5 |
| surface-secondary-fg / surface-sec.   | 12.29:1 | 12.05:1 | 4.5 |
| surface-tertiary-fg / surface-tert.   | 11.38:1 | 11.19:1 | 4.5 |
| muted / background                    |  6.47:1 |  6.63:1 | 4.5 |
| muted / surface-secondary             |  6.01:1 |  5.63:1 | 4.5 |
| default-fg / default                  | 10.82:1 | 10.83:1 | 4.5 |
| accent-fg / accent (button label)     |  5.80:1 |  6.81:1 | 4.5 |
| accent as text / background           |  5.63:1 |  6.90:1 | 4.5 |
| success-fg / success                  |  4.94:1 |  7.51:1 | 4.5 |
| warning-fg / warning                  |  4.78:1 |  8.07:1 | 4.5 |
| danger-fg / danger                    |  5.43:1 |  5.74:1 | 4.5 |
| foreground / field                    | 15.81:1 | 13.51:1 | 4.5 |
| accent vs background (focus, non-text)|  5.63:1 |  6.90:1 | 3.0 |
| danger as text / background           |  5.27:1 |  5.79:1 | 4.5 |
| success as text / background          |  4.80:1 |  7.45:1 | 4.5 |

All 32 pairings PASS. Key hexes: light bg #f7f3eb, light accent #8e503a,
dark bg #130f0a, dark accent #d78863.

Gotchas learned:
- The old global.css font tokens (`montserrat-Bold`) never matched the
  registered font names (`Montserrat_700Bold`), so HeroUI text silently fell
  back to the system font. CSS font vars MUST equal the exact useFonts keys.
- The Remi mascot PNG had a semi-transparent white background (alpha 1–2)
  that was invisible on light but showed as a ghost box on dark — stripped
  alpha<16 pixels with PIL and overwrote the asset.
- Motion: 2 purposeful animations only (welcome staggered rise, assistant
  recommendation-card settle), both `ReduceMotion.System`-gated; verified
  with ReduceMotionEnabled=1 on the sim (instant render, no crash).
- Icons rationalized to Lucide only; removed 5 unused
  @react-native-vector-icons families (packages + app.json plugins).

## M5-T2 news fallback ladder — rung taken (2026-07-07)

Rung 1 (official RSS) shipped: `https://www.uscis.gov/news/rss-feed/59144`
serves clean RSS 2.0 with a browser User-Agent (default agents get 403 /
Drupal antibot on HTML pages, but the RSS endpoint is clean). No newsroom
scraping or static link-out needed. Every cached URL is prefix-validated
against `https://www.uscis.gov/` twice (parse + write).

## Driving the credentialed auth flow in the sim (2026-07-07)

The upgrade-sheet auth form is portal-rendered and invisible to Maestro's
element tree. Working recipe: create accounts via Better Auth's public HTTP
`sign-up/email` on `impressive-fish-50.convex.site`, mint JWTs from
`/api/auth/convex/token` for seeding via `convex.cloud/api/mutation`, then
sign into the APP through the regular sign-in screen (keychain reset →
Welcome → pbcopy+Paste per field → Sign in), which Maestro CAN drive. This
unlocked the full live moderation round-trip (hide/restore/block/unblock).
