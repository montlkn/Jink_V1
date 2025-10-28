# Backend: Schema Overview

## Summary
Defines relational layout for Supabase database powering JINK.

## Tables
- **users:** id, email, joined_at
- **profiles:** user_id, archetype_vector, total_xp, level
- **scans:** id, user_id, building_id, confidence, timestamp
- **buildings:** id, name, coords, style_vector, metadata
- **xp_transactions:** id, user_id, amount, reason, source_id, timestamp
- **passport_entries:** id, user_id, building_id, acquired_at, source
- **quests:** id, name, type, xp_reward, expires_at
- **user_quests:** user_id, quest_id, completed_at
- **walks:** id, user_id, route_json, duration, created_at

> *Schema is the invisible architecture behind the visible one.*
