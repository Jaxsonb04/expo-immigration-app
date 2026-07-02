# Own identity in-house (Better Auth) as the system of record for sensitive immigration PII

Identity and account management run on Better Auth hosted inside our Convex deployment (`@convex-dev/better-auth`) rather than a third-party hosted identity provider (Auth0/Clerk/Cognito), so the system of record for the most sensitive category of immigration PII stays under our control. This gives full control over recovery flows, social-provider posture, and data-subject (export/delete) proofing, at the cost of building and maintaining auth, email verification, and provider integrations ourselves.

## Consequences

The social-provider set (Google + GitHub are code-ready but gated on unset OAuth secrets; GitHub is a poor fit for this audience; Apple Sign In is required by App Store Guideline 4.8 if Google ships) and the email-verification policy (currently `requireEmailVerification: false`, no email sender) must be decided before launch so that account recovery and verifiable export/deletion are possible.
