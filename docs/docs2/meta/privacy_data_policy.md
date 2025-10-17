# Privacy & Data Policy (Product Spec)

## Principles
- Collect the least; protect the most.
- User control: export + delete.
- Anonymize location aggressively.

## Data Handling
- GPS rounding to 3-decimal degrees for analytics (≈110m)
- No raw images stored by default; keep only fingerprint/embedding unless user opts into library
- Contributions are public after verification; redact PII

## Rights
- Export: email link with JSON/CSV bundles
- Delete: 7-day grace, then full purge (soft delete window for undo)

## Retention
- XP ledger: indefinitely (pseudonymized)
- Analytics events: 12 months rolling
- Crash logs: 30 days
