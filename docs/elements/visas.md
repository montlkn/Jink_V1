# VISAS (neighborhood achievements)

## Purpose (reworked)
Visas are neighborhood-level, poignant achievements. They are aesthetic, represent local familiarity, and celebrate place-based commitment. A visa signals “I know this neighborhood.” They are not primarily access gates. Use them to add emotional weight to the passport.

## Example use-case
- "Bed-Stuy Visa" awarded when a user visits 10 distinct buildings in Bedford–Stuyvesant.
- The visa is visible on the passport page for that neighborhood with a small signature/graphic.
- Can be purely cosmetic or optionally mapped to minor perks (profile title, small XP bonus).

## Data model
- `visas_def`: `id, slug, title, neighborhood_id, requirement (e.g., 10 unique buildings), description, artistry`
- `user_visas`: `id, user_id, visa_id, granted_at, granted_for (metadata: total_buildings, example_buildings), signature_blob, revoked_at`

## Rules
- Visas are **earned** when condition met (e.g., 10 unique scans in neighborhood). No manual approval needed.
- Visas are aesthetic by default. Grant small XP bonus (one-time) and title in bio (for example 15 visas).
- Record provenance: list of buildings that contributed to the visa. (Geofiltering from database)

## UX
- Passport neighborhood page lists the visa, its badge, and the contributing buildings.
- Click visa to show why it was awarded and the date.
- Offer “Show neighborhood gallery” for collected images or derives.

## Telemetry
- `event_visa_granted {user_id, visa_id, neighborhood_id, count_for_grant, granted_at}`
- `event_visa_revoked {user_id, visa_id, reason}`
