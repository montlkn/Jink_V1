# Core: Data Flow

## Summary
End-to-end data journey across the JINK ecosystem: from user gesture to backend record and back to the orb.

## Flow
1. **Camera Capture** → triggers CLIP embedding and location capture.
2. **Edge Function /scan/identify** → returns building match and metadata.
3. **Supabase Writes** → updates `scans`, `xp_transactions`, and `profiles`.
4. **Frontend Reacts** → XP state, orb pulse, passport updates.
5. **Derive Recalculation** → new routes influenced by profile drift.

## Visual Summary
User → Camera → CLIP → Supabase → XP → Orb → Passport → Derive

> *Information should move as fluidly as curiosity.*
