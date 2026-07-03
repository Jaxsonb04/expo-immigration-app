# Immigration Renewal Help

Immigration Renewal Help is an Expo mobile app for people in the United States
who need help preparing recurring USCIS renewal and replacement applications.
The current product scope is intentionally narrow: Form I-765 for Employment
Authorization Documents and Form I-90 for Permanent Resident Cards.

The app is an information-only self-help tool. It helps an applicant collect
answers, organize supporting documents, preview a completed form, and unlock a
print-ready filing package. It does not file with USCIS, give legal advice,
represent the applicant, or imply government affiliation.

## What It Does

- Starts one of five supported situations:
  - Work Permit initial application, renewal, or replacement
  - Green Card renewal or replacement
- Keeps a reusable applicant profile so later applications can start with known
  facts already filled in.
- Guides applicants through a question-first interview instead of exposing raw
  USCIS form fields.
- Saves progress only when the applicant taps Next, so each completed step is
  validated and persisted intentionally.
- Maintains a document vault and explicit needed-document slots for active
  applications.
- Renders draft previews and filled USCIS PDF templates for I-765 and I-90.
- Tracks post-filing cases through manually entered receipt numbers.
- Mirrors paid unlock state in Convex entitlements instead of trusting only the
  client purchase state.

## Product Boundaries

This codebase is built around a few hard constraints:

- **Application** is the product unit. A case exists only after USCIS receives a
  filed application.
- **Applicant** and **account holder** are different concepts. One account can
  manage multiple applicants.
- **Service Fee** and **USCIS Filing Fee** must stay separate in product copy and
  data model.
- **Autofill** flows through the applicant profile into a new application's own
  draft. A new application never reads another application's answers directly.
- **No autosave.** Every Next action validates, saves, marks step progress, and
  returns the next step.
- **No legal advice.** Copy and workflows must not recommend legal strategy,
  guarantee approval, or imply USCIS endorsement.

See [CONTEXT.md](./CONTEXT.md) for the domain language and
[REARCHITECTURE.md](./REARCHITECTURE.md) for the rebuild decisions behind the
current shape of the app.

## Tech Stack

- Expo 57 and Expo Router
- React Native 0.86 with React 19
- TypeScript 6
- HeroUI Native and HeroUI Native Pro
- Uniwind and Tailwind CSS v4 for React Native styling
- Convex as the single backend
- Better Auth with Convex integration, email/password, anonymous auth, and
  optional Google/GitHub OAuth
- TanStack React Form for the multi-step interview
- pdf-lib for USCIS PDF filling
- Vitest and convex-test for unit and backend tests

## Repository Map

```text
src/app/                         Expo Router routes and modal/tab shells
src/components/                  Shared UI, account, form, and provider layers
src/screens/home/                Home dashboard, attention items, activity
src/screens/documents/           Document vault and needed-document views
src/screens/applications/        New application flow, Journey Hub, PDF output
src/screens/interview/           Question-first application interview
convex/                          Schema, auth, queries, mutations, tests
convex/shared/                   Shared application shapes and step definitions
convex/model/                    Backend domain helpers
assets/forms/                    Bundled USCIS PDF templates and metadata
docs/adr/                        Architecture decision records
```

Routes in `src/app` should stay thin. Domain behavior belongs in screen modules,
Convex functions, shared shapes, or model helpers.

## Getting Started

### Prerequisites

- Node.js 20 or newer
- Bun, npm, or another package manager compatible with this lockfile setup
- Xcode for iOS development or Android Studio for Android development
- A Convex account and deployment for backend-backed flows

### Install

```bash
bun install
```

If you prefer npm:

```bash
npm install
```

### Configure Environment

Create a local `.env` file for Expo:

```bash
EXPO_PUBLIC_CONVEX_URL=https://<your-deployment>.convex.cloud
EXPO_PUBLIC_CONVEX_SITE_URL=https://<your-deployment>.convex.site
```

Convex deployment secrets are managed with the Convex CLI, not the Expo `.env`
file. Optional social sign-in providers are enabled only when these are present:

```bash
npx convex env set GOOGLE_CLIENT_ID <value>
npx convex env set GOOGLE_CLIENT_SECRET <value>
npx convex env set GITHUB_CLIENT_ID <value>
npx convex env set GITHUB_CLIENT_SECRET <value>
```

Email/password and anonymous auth work without social OAuth credentials.

### Run Convex

```bash
npx convex dev
```

Keep this running while developing backend-backed screens. Convex generated files
under `convex/_generated/` are expected and should be updated by the Convex CLI.

### Run the App

```bash
bun run start
```

Common native targets:

```bash
bun run ios
bun run android
```

The app scheme is `immigrationrenewalhelp`, which is also used by Better Auth's
Expo deep-link callback configuration.

## Development Workflow

### Code Quality

```bash
bun run lint
bun run typecheck
bun run test:once
```

`bun run test:once` runs Vitest with `--passWithNoTests`. Convex tests use
`convex-test` and the edge runtime; PDF tests use the real bundled USCIS form
templates as field-map tripwires.

### Convex Rules

Before editing Convex code, read:

```text
convex/_generated/ai/guidelines.md
```

Important local rules:

- Every app-owned table is scoped by a server-derived `ownerId`.
- Never accept `ownerId`, `userId`, or another authorization identity from the
  client.
- Every Convex function needs argument validators.
- Prefer indexes over filters.
- Keep high-churn interview answers in `applicationDrafts`; keep
  `applications` small and stable.
- Requirement slots are explicit rows in `applicationDocuments`, not absence of
  data.

### PDF Form Templates

USCIS templates live in `assets/forms/`. Field maps are intentionally pinned in
tests because visually similar AcroForm widgets can have surprising internal
names or ordering.

Run this after changing PDF maps or bundled forms:

```bash
bun run test:once -- src/screens/applications/journey-hub/pdf/pdf.fill.test.ts
```

## Current Backend Model

The app-owned Convex schema contains seven tables:

- `applicants`: people managed by an owner, including self and dependents
- `applications`: stable metadata for one applicant's form workflow
- `applicationDrafts`: typed per-form answers and step completion
- `applicationDocuments`: needed, attached, or waived requirement slots
- `documents`: vault files and expiry metadata
- `cases`: manual post-filing case tracking
- `entitlements`: per-application unlock state mirrored from purchase events

Better Auth owns identity data in its component namespace. The app schema does
not keep a separate user-profile table.

## Documentation

- [CONTEXT.md](./CONTEXT.md): product glossary and preferred domain language
- [REARCHITECTURE.md](./REARCHITECTURE.md): rebuild context and implementation
  boundaries
- [docs/adr](./docs/adr): architecture decision records
- [assets/forms/README.md](./assets/forms/README.md): USCIS form asset notes
- [convex/README.md](./convex/README.md): Convex directory notes

## Legal And Policy Notes

This repository contains software for preparing self-help immigration paperwork.
Do not add user-facing copy or behavior that says or implies:

- the app files directly with USCIS
- the app is affiliated with, approved by, or endorsed by USCIS
- the app gives legal advice
- approval is guaranteed
- the Service Fee includes government filing fees

Public launch copy, Terms of Service, Privacy Policy, disclaimers, preparer
section handling, and payment language should be reviewed by qualified counsel.
