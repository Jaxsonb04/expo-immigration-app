# Case tracker uses manual receipt-number entry in v1

The case tracker obtains status from manual receipt-number entry by the user, modeling a defined Case Status enum (Case Received → Biometrics → Request for Evidence → Approved → Card Is Being Produced → Card Was Mailed → Card Was Delivered) and a history timeline. No USCIS API integration ships in v1, and scraping myUSCIS is ruled out (Terms-of-Service violation, CAPTCHA-gated).

## Consequences

- Phase 6 is fully shippable with no dependency on uncertain government API approval.
- Real-time auto-refresh is deferred; the official USCIS Torch Case-Status API (production access requires a live demo + signed Developer Portal Affidavit) can be added later as an additive upgrade without reshaping the status model.
- The success metric "≥2 status checks/user/week" depends on the user manually opening the tracker, since there is no background status sync in v1.
