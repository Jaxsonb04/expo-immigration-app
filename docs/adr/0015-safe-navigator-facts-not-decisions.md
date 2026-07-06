# Safe navigator extracts facts; deterministic code decides (never legal advice)

The Assistant's form navigator (M1-T2) routes users to one of the five supported
I-765/I-90 situations without ever inferring eligibility or giving legal advice
(ADR-0004). It splits the two responsibilities:

- **Claude extracts plain-language FACTS only** — four enum/boolean fields
  (`credential`, `situation`, `wantsEligibilityOrOutcomeJudgment`,
  `mentionsUnsupportedMatter`) via structured output. It never decides a form, a
  kind, or eligibility.
- **Deterministic code classifies** those facts into the `AssistantRecommendation`
  discriminated union (`supported` / `needsClarification` / `outOfScope`), reusing
  `isSupportedSituation`. Only honest facts that genuinely map to a supported
  situation can yield `supported`.

## Defense-in-depth (the trust boundary is the LLM extraction)

Because the safety rests on honest extraction, redundancy makes a single
mis-extraction — or a prompt injection — non-fatal:

1. Two orthogonal legal-advice / out-of-scope signals, not one trust-bearing
   boolean.
2. A deterministic pre-screen over the raw user text (eligibility category codes
   like `C08` / `(c)(8)`, legal-advice phrases, and high-confidence unsupported
   terms such as asylum / I-130 / naturalization) that forces `outOfScope`
   **before** the LLM facts are trusted. Over-refusing here is safe: every hit is
   out-of-scope, never `supported`.
3. Boundary validation: off-schema model output falls back to "undisclosed"
   facts → `needsClarification`.

## Consequences

- **Reason precedence:** `unsupportedForm` is evaluated before `legalAdvice`, so
  an out-of-scope form ("am I eligible for asylum?") is told "we don't handle that
  form" rather than the more legally-fraught "we can't give legal advice."
- **greenCard + firstTime** (I-90 initial) is `outOfScope('unsupportedSituation')`;
  user-facing copy must explain that a first Green Card comes through a different
  process the app doesn't handle.
- **renewal vs replacement** both reach `supported`; because they carry different
  USCIS fees/checkboxes, the UI must echo the detected `applicationKind` back for
  explicit user confirmation before preparing the filing (M1-T3 / M1-T4).
- The invariant "no legal-advice / injection / out-of-scope input ever yields
  `supported`" is asserted by an adversarial test matrix (vetted by a 5-agent
  panel; 53 classifier tests). A live extraction eval against the real model is a
  tracked follow-up.
