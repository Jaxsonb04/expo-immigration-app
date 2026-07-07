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
