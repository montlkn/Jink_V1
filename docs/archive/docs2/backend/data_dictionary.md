# Data Dictionary (compact v1)

## profiles
- user_id (uuid, pk)
- archetype_vector (jsonb[9 floats])
- total_xp (int)
- level (int)
- confidence (float 0..1)
- plan (text: Free|Pro)
- updated_at (timestamptz)

## scans
- id (uuid, pk)
- user_id (uuid)
- building_id (int)
- confidence (float)
- gps (geog point)
- heading (float deg)
- created_at (timestamptz)

## buildings
- id (int, pk)
- name (text)
- coords (geog point)
- style_vector (vector(512) + jsonb[9])
- metadata (jsonb)
- model_id (text)
- updated_at (timestamptz)

## xp_transactions
- id (uuid)
- user_id (uuid)
- amount (int)
- reason (text)
- source_id (uuid|int|null)
- created_at (timestamptz)

## passport_entries
- id (uuid)
- user_id (uuid)
- building_id (int)
- acquired_at (timestamptz)
- source (text: scan|derive|quest)

## contributions
- id (uuid)
- user_id (uuid)
- building_id (int)
- text (text)
- media_urls (text[])
- sources (text[])
- credibility (float)
- status (text: submitted|verified|rejected)
- created_at (timestamptz)
