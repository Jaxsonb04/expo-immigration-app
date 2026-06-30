# Build the filing wizard on a single TanStack Form instance with per-section FormGroups

Each Filing's Interview runs on **one `useAppForm` instance** whose `defaultValues` is keyed per interview section. Each step scopes its fields with **`form.FormGroup name="section"`** carrying a per-step `onDynamic` Zod schema and validates-then-advances via `onGroupSubmit`; the form uses **`revalidateLogic()`**; the final step calls **`form.handleSubmit()`** to run a lenient full-form schema and the real `onSubmit` (the paywalled output export). This follows the official TanStack [multi-step-wizard example](https://github.com/tanstack/form/tree/main/examples/react/multi-step-wizard), **two-thirds of which already exists in this repo** (`createFormHook`/`useAppForm`/`withForm`/`withFieldGroup` in `src/components/form/` plus the bound field components).

A single **host screen** owns the form instance and the visible-step index and swaps step components (not a route-per-step), so cross-step values, cross-step validation, and a single submit payload come for free. Step components are `withForm` consumers that render the [Interview](./0012-question-first-interview.md) `InterviewStep` shell around their `form.AppField`s.

## Why

One form store keeps every answer across steps without loss, supports branching (`getVisibleSteps`) and a single final payload for the `pdf-lib` export (ADR-0006), and reuses the repo's existing form primitives. Route-per-step would risk multiple independent form instances and needs a provider + deep-link guards; the single-host model avoids that.

## Considered Options

One form per step (loses cross-step state — rejected); **one shared form + `FormGroup`s on a single host screen (chosen)**; route-per-step with a `WizardProvider` (only if native push/pop, per-screen headers, and iOS back-swipe are required — deferred).

## Consequences

- Per filing, add a module (e.g. `src/components/filing/i90/`, `src/components/filing/i765/`) with `wizard-form.ts` (`formOptions` defaultValues + per-section schemas + a lenient full-form schema + `getVisibleSteps` branching), `steps/` (`withForm` InterviewStep consumers), and a host component owning the single `useAppForm`.
- Keep per-step schemas **strict** and the full-form schema **lenient** (`.partial()`/`.optional()`) so a skipped branch never blocks the paywalled final submit.
- The per-section schemas are `.pick()`/`.required()` projections of the **shared Zod single-source shapes** (the `zodToConvex` decision) — no re-declaring field shape.
- Verify `form.FormGroup` is exposed by the installed `@tanstack/react-form@^1.33.0` (the example tracks `main`); fallback: gate Next on subscribed field validity + `validateField`.
- **Paywall only the final `onSubmit`** (output export); every step stays free; re-edits reopen the same host against persisted answers.
