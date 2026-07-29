# Application answers live only in the draft; person-facts promote to the applicant profile at Review

Interview answers are stored exclusively in `applicationDrafts` — the interview never edits the applicant row mid-flow. When an application's lenient full-form schema first passes and the user reaches Review, the person-facts subset (declared once in the shared Zod single-source shapes) is **promoted** — copied onto the applicant row. Promotion re-fires on each Review re-entry and overwrites: latest promotion wins. Autofill works the other way around: creating a new application seeds its draft from the applicant profile at creation time.

## Considered Options

Write-through split by field ownership (interview edits the applicant row in place; rejected — editing one application would silently change what other in-flight applications and re-rendered outputs see); draft-only with promotion at Filing Package obtainment (rejected — free preparers who preview-then-abandon would get no autofill on return, and they are exactly the users the retention thesis wants to convert on the second visit); draft-only with promotion at marking-filed (rejected — manual and skippable, so many profiles would never populate); **draft-only with promotion at Review-complete (chosen)** — answers are complete and validated, and it is free.

## Consequences

- A filed application's regenerated Filing Package reflects **its own draft** (plus the vault and current form edition), not shared profile truth — a correction made while preparing a later application does not alter an earlier application's output. This narrows ADR-0007's "always reflects the current data" wording.
- Drafts are self-contained; abandoning a draft before Review loses profile reuse of the data already typed (accepted trade-off).
- Requires an explicit person-fact projection per form family, defined once in the shared Zod shapes — do not hand-maintain a second field list.
- Do not "fix" this into write-through: the one-way draft → profile flow is deliberate.
