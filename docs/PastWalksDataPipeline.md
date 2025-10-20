# Past Walks Data Pipeline Checklist

This repository now assumes two Supabase Edge Functions back the Past Walks screen:

- `past-walk-summaries` – returns an array of walk summaries for the active user.
- `past-walk-geometry` – returns a single walk’s route polyline and the set of polygons the walker has discovered.

## 1. Edge Functions

Template code for both functions lives under `supabase/functions/`. Update the TODO block in each function with your production table names.

```
supabase/functions/
├── _shared/cors.ts
├── past-walk-summaries/index.ts
└── past-walk-geometry/index.ts
```

Deploy with the Supabase CLI:

```bash
supabase functions deploy past-walk-summaries
supabase functions deploy past-walk-geometry
```

For local `supabase functions serve`, place your hosted project credentials in `supabase/functions/.edge-env` using `EDGE_SUPABASE_URL` and `EDGE_SUPABASE_SERVICE_ROLE_KEY` (the CLI ignores variables that start with `SUPABASE_`).

## 2. SQL helper (`rpc_walk_geometry`)

Create a SQL helper that bundles the geometry response. Adjust table and column names to match your schema (examples assume `walks`, `walk_route_points`, and `walk_buildings`).

```sql
create or replace function rpc_walk_geometry(
  p_walk_id uuid,
  p_tolerance float8 default 0.00005
)
returns jsonb
language sql
stable
as $$
with route_points as (
  select jsonb_agg(
           jsonb_build_object('latitude', point.lat, 'longitude', point.lng)
           order by point.sequence
         ) as coords
  from walk_route_points point
  where point.walk_id = p_walk_id
),
seen_buildings as (
  select jsonb_agg(
           jsonb_build_object(
             'type', 'Feature',
             'id', b.id,
             'geometry', ST_AsGeoJSON(ST_SimplifyPreserveTopology(b.geom, p_tolerance))::jsonb,
             'properties', jsonb_build_object('id', b.id, 'name', b.name)
           )
         ) as features
  from walk_buildings b
  where b.walk_id = p_walk_id
)
select jsonb_build_object(
  'walkId', p_walk_id,
  'route', coalesce((select coords from route_points), '[]'::jsonb),
  'buildings', coalesce((select features from seen_buildings), '[]'::jsonb)
);
$$;
```

If PostGIS isn’t available, call the function from Javascript and run geometry simplification with `@turf/simplify` instead.

## 3. Environment variables

Add the following to `.env` (or your Expo secrets store):

```
EXPO_PUBLIC_SUPABASE_URL=... 
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
# Optional – force the client to use in-app demo data during local dev
EXPO_PUBLIC_USE_DEMO_WALKS=1
```

## 4. Data compactness targets

- Simplify building polygons to fewer than ~500 vertices each.
- Deduplicate shared polygons server-side before sending to the mobile client.
- Filter queried buildings to a ~100 m buffer around the walk route when possible.

## 5. Validation

1. Deploy the functions above.
2. Start the Expo dev client and open the Passport → Past Walks modal.
3. Confirm the log output includes summaries and the geometry payload.
4. Ensure the fog-of-war reveals only the buildings returned by Supabase and the dashed route renders end-to-end.

Set `EXPO_PUBLIC_USE_DEMO_WALKS=1` during development to fall back to the baked-in demo geometry.
