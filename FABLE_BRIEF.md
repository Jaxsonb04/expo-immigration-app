# Immifile — fix, redesign, and finish the app

## Why you're doing this

I'm building **Immifile**, a mobile app (Expo / React Native SDK 57, Convex backend) that helps immigrants prepare USCIS **I-765** (work permit) and **I-90** (green card) renewals: an informational Claude assistant, a guided form-to-print-ready-PDF pipeline, case tracking, and a community forum. It's for real, anxious people filing real government paperwork — so it has to feel calm, trustworthy, and finished.

Two framing decisions for this run:
- **The app is free.** No charge, no paywall, no in-app purchase right now — I'll add monetization later. Everything a user can reach should be free.
- **Focus on the app itself.** I'm *not* asking for App Store submission, release engineering, or Better Auth production-hardening in this run — we'll do that later. Keep auth working as it already is (enough for the features), and put your effort into the three things that follow.

Today: **13 of 18 planned tasks are done (through M4-T1); `next_task` is M4-T2.** The AI assistant is misbehaving and the visual design still looks like an untouched component-library template. I need you to fix the assistant, redesign the look, finish the remaining feature milestones, and make everything free — so Immifile is a polished, working app I'd be proud to demo.

Treat this as a hard, multi-day, mostly-autonomous engagement — the kind of end-to-end run you're built for. Scope it, sequence it, execute it, and check your own work as you go. Ask me only when you genuinely need me.

## How to work

- **When you have enough information to act, act.** Don't re-derive settled facts, re-litigate decisions I've made, or narrate options you won't pursue. If you're weighing a choice, pick the strongest and give me one line of why — not a survey.
- **Operate in a loop, not a single pass:** pick the next unit of work → implement → verify it against its acceptance criteria (with a fresh-context subagent where it matters, see below) → record evidence → advance → repeat, until the Definition of Done is met or you're blocked on something only I can provide.
- **You're autonomous; I'm not watching in real time.** For reversible steps that follow from this brief, proceed without asking. **Stop and ask only for:** a destructive/irreversible action, a real scope change, a **spend or a secret only I can provide** (a funded API key), or a genuine product decision this brief doesn't answer. When you stop, ask the one specific question and end the turn — don't end on a promise of work you haven't done. Before ending any turn, check your last paragraph: if it's a plan, a question, or an "I'll now…", do that work now instead.
- **Ground every progress claim in a real result.** Before you tell me something works, point to the passing test, the log line, or the simulator screenshot that proves it. If it's not verified, say so. If tests fail, show the output. Never mark work "done" you can't back with evidence.
- **Verify with fresh eyes, proportionally.** After implementing, spin up a **separate fresh-context verifier subagent** to check against the acceptance criteria for anything that touches **auth, PII, ownership, the deletion cascade, the PDF pipeline, or the assistant fix** — plus a security pass on those. For low-risk JS-only or design-token changes, your own re-run of the test/type/lint/sim loop is enough; don't spawn a subagent per trivial edit. Run a fresh-context check at least once per work session and before any commit touching those sensitive areas.
- **Delegate freely and in parallel** for independent work (auditing a subsystem, researching a USCIS source, reviewing a diff, driving the simulator), and keep working while subagents run.
- **Stay in scope. Do the simplest thing that fully works.** Don't add features, abstractions, backwards-compat shims, or defensive cleanup beyond what a task needs. Validate at real boundaries (user input, external APIs); trust internal framework guarantees. (This applies throughout — I won't repeat it per stream.)
- **Keep a notes file** at `docs/FABLE_NOTES.md`: one lesson per entry, a one-line summary, what worked / what didn't and why. Record real root causes and gotchas; update entries instead of duplicating; delete ones that prove wrong.
- **Your final message to me** is my first look at the whole run — write it as a re-grounding, not a continuation of your working thread. Lead with the outcome, then the one or two things you need from me, each explained as if new. Complete sentences, no working shorthand or arrow-chains, each file/flag/identifier in its own plain clause. If you must choose between short and clear, choose clear.

The assistant fix and the design system are the **hardest** parts of this run — spend proportionally more reasoning and verification there and don't pattern-match them to routine edits.

## First: confirm the ground before you build

Do this before anything else, and stop if any of it is off:

1. **Reach the repo and green the baseline.** Repo is at `/Users/jaxson/develop/expo_immigration_app`. Run the verify loop (`npx eslint .`, `bun run typecheck`, the vitest suite) and confirm it's green (~282 tests as of M4-T1). If it isn't green on a clean checkout, tell me before changing anything.
2. **Confirm the plan file and its contract.** `MASTER_PLAN.md` at the repo root is the spine of the feature work. Its status header is YAML and looks exactly like this — **mirror this format verbatim; do not invent a new one:**
   ```yaml
   status: in_progress
   current_milestone: M4
   next_task: M4-T2
   last_completed: M4-T1
   ```
   Each milestone entry is a checkbox with `Status:`, `Done when:`, and an `Evidence:` line. The Progress Contract: a task is `DONE` only after its tests + acceptance checks pass; the same commit that completes it flips `[ ]`→`[x]`, sets `Status: DONE`, writes an evidence entry, and advances `next_task`. If the plan file or contract isn't as described, stop and tell me.
3. **Capture the dirty tree so nothing can be lost.** The working tree already has **uncommitted M4-T2 community work** (modified `src/app/(tabs)/community/index.tsx`, `src/screens/community/community.screen.tsx` + `index.ts`; untracked `new-post.tsx`, `community/[postId].tsx`, `community.data.ts`, `community.detail.tsx`, `community.new.tsx`, `community.report.tsx`, `community.format(.test).ts`). **Before any command that touches the tree** (prebuild, checkout, reset), snapshot it — `git stash push -u -m "pre-fable-snapshot"` then restore, or a `wip:` commit on a scratch ref — so it can never be lost. Then read every one of those files and write a one-paragraph summary of what the in-tree M4-T2 currently does.
4. **Confirm push access early.** Push works **only** via the SSH remote (`git@github.com:Jaxsonb04/expo-immigration-app`); there's no `gh` CLI and HTTPS creds fail here. Run `git ls-remote` on day one so a broken push credential surfaces now, not later. If it's broken, that's mine to fix — tell me.

## Environment facts that are load-bearing (the non-obvious ones)

- **The app's user-facing name becomes `Immifile`** (was "Immigration Renewal Help"). Rename every user-facing occurrence — the `name` in `app.json`, the display name, and any "Immigration Renewal Help" strings in onboarding/UI copy. **Leave the internal technical identifiers as they are for now** — the scheme `immigrationrenewalhelp://`, the iOS bundle `dev.uing.immigrationrenewalhelp`, and the slug — because the scheme is wired into Better Auth trusted-origins and the Maestro deep-links, and renaming those is a coordinated release-time job that's invisible to users. (Note this deferral in `FABLE_NOTES.md`.) Apple team is `F8V4932HJN`, version `1.0.0`.
- **Style gate is ESLint, not Prettier** — `npx eslint .` (`--fix` to autofix). House style is **tabs, single quotes, no semicolons**. There's a `format:check` Prettier script that lies about the real style; ignore it. Running Prettier corrupts the codebase.
- **Convex** is the backend; deployment secrets live in the Convex env (`npx convex env set/list`), never in the client. The db API here is the **1.42 table-name-first** style (the table name is the first argument to `db.get`/`insert`/`patch`/`delete`) — **confirm the exact call shapes from existing calls in `convex/` before writing new ones; match the surrounding code rather than assuming an arg order.**
- **Do all dev/test against the existing *dev* Convex deployment.** A *production* deploy changes what live clients talk to — that's a checkpoint (stop and ask), not something to do autonomously.
- A short **appendix at the end** lists the build/simulator/PATH mechanics. Read it when you first build; don't let it crowd out the work.

---

## The work — three streams, in this order

Each stream de-risks the next. Sequence: **(1) fix the assistant → (2) reconcile in-tree work then lay the new design foundation + rebrand to Immifile → (3) finish the feature milestones on that foundation, free.** Parallelize within a stream where it's safe.

### Stream 1 — Fix the AI assistant (first)

The assistant "isn't working properly." **Reproduce it, root-cause it, then fix it** — don't guess. Context so you don't chase the wrong thing:

- The `ANTHROPIC_API_KEY` **is already set** to a real `sk-ant-api03-…` key, with `ANTHROPIC_MODEL=claude-haiku-4-5`. **Do not assume a missing key.** Verify whether the key is actually *valid and funded* and whether that model id still resolves, using a **throwaway diagnostic Convex action** (`convex/diag.ts`) that calls Anthropic and *returns* the raw `{status, message}` to your terminal via `npx convex run diag:test` — `npx convex logs` is unreliable over the ngrok SSH tunnel this Mac uses, so the diag-action pattern (not logs) is how you get a deterministic answer. Delete the diag action when done. A 401 / out-of-credit / retired-model error has bitten this project before; do **not** introduce a third-party Claude proxy (this is a PII app).
- **If the key turns out to be invalid or unfunded, that's mine to fix** — report the exact error and what to provision, and **don't freeze the run: continue to Streams 2–3** (they don't need a live key) while you wait. Only the *live proof* of the assistant waits on my key.
- **If `claude-haiku-4-5` no longer resolves, don't guess a replacement** — check current Anthropic model ids authoritatively, prefer the closest current Haiku-tier id unless the assistant's quality clearly needs a stronger tier, and note the choice in `FABLE_NOTES.md`.
- The pipeline is **navigator-first, not freeform chat**: each turn runs `convex/navigator.ts` `getRecommendation`, which uses Claude to extract plain-language facts, then *deterministic* code (`convex/shared/navigator.ts`) classifies into `supported | needsClarification | outOfScope`. UI is in `src/screens/assistant/`, quota is 20/day per owner (`convex/assistantQuota.ts`). This constraint is a deliberate **safety boundary** — no legal advice, no eligibility determinations (a wrong answer to an anxious filer is a real UPL and trust risk) — so **keep it.** But judge honestly whether the constrained flow is *itself* what feels broken to someone expecting a working assistant, and improve the interaction (clearer clarifying questions, better suggested replies, graceful error/retry, visible quota, a genuinely helpful empty state) **without weakening the boundary.**
- Trace the whole path — key/model → Anthropic call → structured extraction + Zod validation → classifier → recommendation card → quota → error/refund — find the real break, fix it, add a regression test that would have caught it, and **prove it live in the simulator** (real turn; screenshot the working recommendation and the error/retry state).

Deliverable: a demonstrably working assistant with evidence, and a `FABLE_NOTES.md` entry on the true root cause.

### Stream 2 — Redesign: kill the template look, brand it Immifile

I don't like how it looks. The whole palette in `src/global.css` is the HeroUI-Native default: every token is pinned to **teal-green hue 181.37** (`--accent: oklch(71.73% 0.1096 181.37)`, green-tinted backgrounds/surfaces/borders), Montserrat everywhere. It reads as an untouched template. The **Welcome screen** (`src/app/welcome.tsx`) and **Sign-in screen** (`src/app/sign-in.tsx`) are the first thing anyone sees and the most generic part.

**Sequencing (do this to avoid rework):** first, get the reconciled in-tree M4-T2 work committed against the *current* tokens as its own commit — just enough to build and pass, no polish. **Then** do the token redesign. Because every color/space/font flows from tokens, screens that were half-built before the redesign will restyle automatically and that's fine and intended — you'll re-verify each screen visually here and again as you complete its milestone in Stream 3. **Don't hand-restyle individual screens ahead of the token swap.**

**Design direction — editorial minimalism, in the register of the *Vocabulary* app by Monkey Taps** (Apple Design Award finalist): warm paper grounds instead of clinical white-and-green, an elegant **serif display** face paired with a clean sans for body, generous whitespace and rhythm, large confident type, restrained color used with intent, and small, purposeful motion. Calm, premium, trustworthy. **The written direction below is the spec — treat "like Vocabulary" as flavor, not a pixel target you must recall.** Explicitly avoid the clichés: gradient blobs, glassmorphism, neon accents, dense uniform card grids, centered-hero-with-CTA. When in doubt, more whitespace and larger, quieter type. Design a deliberate **light theme first, and an equally intentional dark theme** — not dark by default.

Concrete anchors (starting points to refine via the HeroUI theme tools, not literal mandates):

- **Palette:** a warm ivory background around `oklch(96–97% 0.01 ~85)` (low-chroma warm hue, *not* teal), ink text around `oklch(23–26% 0.02 ~60)`, and **one** restrained accent (a muted ink-blue or a warm terracotta, chroma ≤ ~0.09) reserved for primary actions and focus — **not** tinting every surface. All neutrals carry a faint shared warm cast. Derive success/warning/danger as low-chroma, warm-compatible variants, not the stock HeroUI greens/reds.
- **Dark theme is its own composition, not an inverted light theme:** a warm near-black ground (e.g. `oklch(16–20% 0.01 ~70)`, never pure black, never the old teal-tinted dark), warm off-white text (~`oklch(92% 0.01 ~80)`), an accent re-tuned (lift lightness/chroma) so it stays legible on the dark ground; elevation from lighter warm surfaces, not heavy shadows.
- **Type:** an OFL-licensed serif-display face bundled via `expo-font` (candidates: Fraunces, Newsreader, Source Serif 4, Instrument Serif) paired with a clean sans for body/UI (Inter is fine) — **≤ 2 families total.** Confirm the license permits app redistribution before bundling; set matched-metric system fallbacks (serif → Georgia, sans → system) so the pre-load frame doesn't reflow. Define a modular type scale as tokens (~1.25 ratio: display ~40–56 / h1 ~32 / h2 ~24 / body ~16–17 / caption ~13), serif for display/headlines only, sans for body and anything ≤ h2. Body line-height ~1.5, headline ~1.1.
- **Rhythm & elevation:** a 4/8-based spacing scale as tokens, deliberately generous section spacing on onboarding (not default card padding); a restrained elevation model — prefer flat warm surfaces + hairline warm borders + space over shadows; if a shadow is used, one soft token applied consistently. Differentiate radius between large surfaces and small controls; don't put a uniform radius on everything.
- **Signature components (apply consistently):** primary button = solid accent, generous height, real press/focus/disabled states; cards = flat warm surface + hairline border + roomy padding; **the assistant recommendation card is the centerpiece — treat it editorially.** Refine the existing **Remi mascot** (`assets/images/remi-mascots/waving.png`, used on `welcome.tsx` beside the anonymous "Start filing" action) — consistent size/placement, used with intent, not clip-art. Every interactive element gets designed hover/press/focus/disabled states.
- **Iconography:** rationalize to **one** cohesive line-icon family whose stroke weight matches the sans; remove the unused `@react-native-vector-icons` families. Icons should look drawn for this system, not borrowed from three.
- **Motion:** add only 2–3 restrained, purposeful motions (e.g. a gentle staggered fade/translate-up on the Welcome headline, a soft press-scale on primary buttons, a calm transition into the recommendation card), ~150–300ms ease-out, **transform/opacity only.** Gate all of it behind `AccessibilityInfo` reduce-motion (fall back to instant/opacity) and verify the reduced path in the sim. No looping or decorative animation on a filing app.

**Immifile branding:** wire the new name into onboarding copy and the app name, and give it a **splash and app icon** consistent with the new palette (a clean "Immifile" wordmark or a simple mark in the accent color on the warm ground is plenty — the current icon/splash are placeholder white/green). This is branding the app you're building, not release engineering; keep it simple and on-system. Do **not** make the icon/name imply USCIS or any government affiliation.

**Execution discipline:**

- **The HeroUI Native Pro MCP is the source of truth** for component APIs and theme tokens — check it before guessing props or changing a token, and read the current theme variables before you touch them. Use `heroui-native` (base) + `heroui-native-pro` (Pro) only, never HeroUI web packages. Read the `heroui-native-pro` and `heroui-pro-design-taste` skills first.
- **Everything through tokens** in `src/global.css` (`@theme` + `@layer theme` light/dark) — no hardcoded hex/oklch/spacing/radius scattered in components. **Prove the token system on Welcome + Sign-in (light and dark) before propagating**, then flow it through the four tabs, the interview/journey-hub flow, and shared components.
- **Contrast is a measured gate, not a screenshot judgment.** For every text/background and every interactive/state pairing, in **both** themes, compute the actual ratio and record it in `FABLE_NOTES.md`: body text ≥ 4.5:1, large text (≥24px, or ≥18.66px bold) and non-text UI/focus indicators ≥ 3:1. If the warm accent can't clear 4.5:1 as text on paper, darken it or reserve it for large/non-text use.
- **Completion gate:** grep the codebase for any remaining hardcoded colors and any `oklch` hue `181.37` or stray hex in components — there should be none. Screenshot each of the four tabs in both themes to confirm no screen still shows the teal palette. Judge it against "does this look like a real, intentional product, not a template default?"

Deliverable: a cohesive, distinctive, accessible Immifile design system; the teal-green template look gone; onboarding that looks like the app's best screen; before/after screenshots in both themes.

### Stream 3 — Finish every remaining feature milestone (all free)

Continue `MASTER_PLAN.md` from `next_task`, completing each to its `Done when` + Test Plan on top of the new design system, honoring the Progress Contract (tests + sim proof + evidence + `next_task` advance per commit). The one-line stakes are there so you can make the judgment calls well:

- **M4-T2 Forum UI** — wire the reconciled in-tree community screens to the M4-T1 backend: anonymous reading; posting/commenting/reporting require a credentialed (non-anonymous) account via the existing gate. Use the **existing** auth/upgrade path as-is — do the minimum wiring to make posting work; don't harden Better Auth or add new sign-in providers in this run. No DMs/attachments in v1.
- **M4-T3 Moderation** — reporting UX, admin-only hide/restore, community rules, a block-user control, and clear "not legal advice" warnings; never expose private owner identifiers. (These are good product hygiene for a forum regardless of any future store submission.)
- **M5-T1 Renewal reminders** — schedule 180/90/30/7/1-day reminders from document expiry dates; require a recoverable (credentialed) account; handle notification permissions, reschedule, and cancellation.
- **M5-T2 Recent news** — cache and show the latest **official USCIS** news on the Assistant screen with source links, timestamps, and a stale-cache fallback (a wrong or unofficial item shown to an anxious filer is a trust/UPL risk). Fallback ladder: prefer an official USCIS RSS/API feed; if none exists, a bounded fetch of the official USCIS newsroom page is acceptable *if* it's the official domain; if even that's infeasible, ship a curated static link-out to the official newsroom with a clear timestamp rather than nothing. Never surface unofficial/aggregator content. Note which rung you took in `FABLE_NOTES.md`.
- **M5-T3 Quality audit** (the plan's "Release audit," reframed for this run) — verify privacy, that **in-app account deletion is reachable and complete** (the cascade exists in `convex/model/ownerData.ts`), accessibility, rate limits, and that "not legal advice / informational only" disclaimers read clearly. **Skip the App-Store-submission parts** (store metadata, EAS submit, App Privacy questionnaire) — those are for a later release run; just document what's left for that day.

**Make everything free (do this as part of Stream 3):** the app must show **no charge and no paywall.** In the PDF pipeline, the clean "filing package" export is currently entitlement-gated behind a paid unlock (M2-T4) — **make the clean export free for every user.** Remove the paywall/purchase UI and the app's **service-fee line item** from the Review & Pay screen (`journey-hub.review-pay.tsx`); do **not** wire RevenueCat or any in-app purchase. Keep showing the **USCIS government filing fee** as *informational* ("paid directly to USCIS, never to this app") with its provenance tag, and keep all disclaimers. So monetization is easy to switch on later, you may leave the server-side entitlement seam in place but **default it to unlocked** — just make sure nothing the user sees implies a charge. Rename/repurpose the Review screen copy so it no longer reads as "Review & **Pay**."

**Touch-ups where it's genuinely lacking** (you prioritize): the real deferred correctness gap is **the I-90 Part 2 application-type/reason checkboxes are unmapped, so a generated I-90 shows no renewal-vs-replacement reason** — fix it, because it's a defect on a form people will actually file. Fix anything else that would embarrass a polished free app (empty/error states, copy, accessibility, obvious polish).

---

## Explicitly out of scope for this run (later)

Don't spend effort on these now — note anything you notice for later in `FABLE_NOTES.md`:
- **Monetization / IAP / RevenueCat** — the app is free; no purchase flow.
- **Better Auth production-hardening** — no Sign in with Apple, no new provider config, no email-verification/password-reset build-out, no `AUTH_HANDOFF.md`. Keep the existing anonymous + email/password + credentialed-gate behavior working as-is; only touch auth if a feature above literally needs a small fix to function.
- **App Store release engineering** — no `eas.json` submit config, no store assets beyond the Immifile icon/splash, no App Privacy questionnaire, no production deploy.

If you hit something in these areas that blocks a feature, do the *minimum* to unblock and flag the rest for later — don't take on the whole deferred stream.

## Definition of Done

1. **The assistant works, proven live** (or, if blocked on a key only I can fund, the exact ask is reported and Streams 2–3 proceeded anyway).
2. The **teal-green template look is gone**; the app is branded **Immifile** (name, onboarding copy, icon/splash); onboarding and the four tabs share one distinctive, accessible, Vocabulary-register design system (light + dark), with measured contrast recorded and before/after screenshots.
3. **Every feature milestone (M4-T2 through M5-T3) is `[x] DONE`** with passing tests, simulator evidence, and an evidence entry; `next_task` reflects it; the I-90 reason-checkbox defect is fixed.
4. **The app is free everywhere** — no paywall, no purchase UI, no service-fee line; the clean PDF export works for everyone; USCIS government fees still shown as informational.
5. **Green throughout** (`npx eslint .`, `bun run typecheck`, full test suite). Commit freely on `main` and push via the SSH remote as you go (never force-push). A **production Convex deploy** is a checkpoint — prepare it, then stop and tell me to run it.

The run is complete when the assistant works, Immifile looks intentional, all the feature milestones are done and free, and the build is green. Start now, end to end; tell me only what you truly need along the way.

---

## Appendix — build & simulator mechanics (read when you first build; don't let it crowd the work)

- **PATH for any build/pod/convex/test command** (non-login shells here exclude `/usr/local/bin`, where `node` and `pod` live):
  `export PATH="/usr/local/bin:$HOME/.bun/bin:/opt/homebrew/bin:$PATH"` and `export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 RUBYOPT="-rlogger -EUTF-8"`.
- **Native build:** `bunx expo run:ios --device <SIM_UDID>`, run detached (`nohup … > /tmp/ios-build.log 2>&1 &`) and poll the log so a dropped connection can't kill it. Two sims are booted — iPhone 17 and iPhone 17 Pro, iOS 26.5 — **target by UDID, not name.** JS-only changes need no rebuild (relaunch reattaches to warm Metro on `:8081`).
- **Fonts / prebuild:** if icon glyphs render as tofu/emoji, run `expo prebuild --clean -p ios` then `pod install`. Note the two font cases are different: the **icon** vector-icon families are already handled by their config plugins — don't also register those TTFs manually. For a **new text/display font** (the serif) or an app-name change, adding it via the `expo-font` plugin / `app.json` + clean prebuild is the correct path; after any such change, do a full native rebuild and screenshot to confirm. `prebuild --clean` regenerates `ios/` (gitignored/CNG) — confirm nothing hand-edited there is lost.
- **Simulator QA (Maestro):** pass `--device <UDID>`. On iOS 26.5, `inputText` **crashes** the XCUITest driver — drive via taps + `openLink` deep links (`immigrationrenewalhelp://…`) and `pressKey: Enter` to dismiss the keyboard; match selectors by visible-text substrings/regex, not exact strings; `xcrun simctl keychain <UDID> reset` clears persisted secure-store drafts. Screenshot with `xcrun simctl io <UDID> screenshot /tmp/x.png`. If top-right header taps don't register, check whether an Expo dev-client overlay is intercepting them.
- **Git:** conventional commits (`feat(scope): …`); for messages with apostrophes, write a message file and `git commit -F`. Ignore the stale untracked `apps/` directory.
