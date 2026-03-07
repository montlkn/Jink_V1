# Fix: "value too long for type character varying(10)" on aesthetic event flush

## Cause
The `user_aesthetic_events.building_bbl` column was created as `VARCHAR(10)`. Some BBL/BIN values are longer, so inserts from the aesthetic event queue can fail with:

```text
ERROR [aestheticEventGateway] Failed to flush queue {"code": "22001", "message": "value too long for type character varying(10)"}
```

## What we did in the app
The app now truncates `building_bbl` to **10 characters** before insert, so the error stops and the queue can flush. Truncation is logged as a warning.

## Recommended fix (database)
To allow full BBL values (up to 20 chars) and avoid truncation:

1. **Apply the existing migration** (if you haven’t already):
   ```bash
   npx supabase db push
   ```
   or run this SQL in the Supabase SQL editor / your migration runner:
   ```sql
   -- File: supabase/migrations/20251219_fix_bbl_varchar_length.sql
   ALTER TABLE public.user_aesthetic_events
     ALTER COLUMN building_bbl TYPE VARCHAR(20);
   ```

2. **Optionally increase the app limit** after the migration is applied:  
   In `src/services/gateways/aestheticEventGateway.ts`, change:
   ```ts
   const BBL_MAX_LEN = 10;
   ```
   to:
   ```ts
   const BBL_MAX_LEN = 20;
   ```

After the migration, `building_bbl` can store up to 20 characters and you can set `BBL_MAX_LEN = 20` to avoid truncating valid IDs.
