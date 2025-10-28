# Seeding & Content Pipeline

## Input
- CSV: buildings (id,name,lat,lng,year,style tags)
- Assets: stamps (SVG/PNG), copy blocks
- Curator notes

## Steps
1) Validate CSV schema
2) Geocode sanity check and dedupe
3) Embed images → vector column
4) Generate short summaries (batch)
5) Stamp art mapping table
6) QA list; push to staging; spot-check derives
7) Promote to prod with version tag

## Rollback
Keep last 2 seeds; revert by version id.
