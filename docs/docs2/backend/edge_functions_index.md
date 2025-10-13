# Backend: Edge Functions Index

## Summary
Catalog of deployed endpoints and their responsibilities.

## Endpoints
- /scan/identify: image + GPS → building match, XP write, stamp award, profile drift
- /xp/update: append XP transaction and compute level changes
- /route/derive: personalized path creation
- /route/complete: finalize walk, award XP
- /orb/pulse (optional client echo): UI animation hints

## Notes
Secure with RLS-compatible service role calls where needed. Log execution time and errors to a central table.
