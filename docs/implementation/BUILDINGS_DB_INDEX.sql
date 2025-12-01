-- Add indexes to Buildings DB for faster spatial queries
-- Run this on the Buildings Supabase instance (NOT the App DB)

-- Create indexes on geocoded_lat and geocoded_lng for bounding box queries
CREATE INDEX IF NOT EXISTS idx_buildings_geocoded_lat
ON buildings_full_merge_scanning(geocoded_lat)
WHERE geocoded_lat IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_buildings_geocoded_lng
ON buildings_full_merge_scanning(geocoded_lng)
WHERE geocoded_lng IS NOT NULL;

-- Composite index for bounding box queries (both lat and lng)
CREATE INDEX IF NOT EXISTS idx_buildings_geocoded_lat_lng
ON buildings_full_merge_scanning(geocoded_lat, geocoded_lng)
WHERE geocoded_lat IS NOT NULL AND geocoded_lng IS NOT NULL;

-- Optional: Add PostGIS extension and spatial index for even better performance
-- CREATE EXTENSION IF NOT EXISTS postgis;
--
-- -- Add geography column
-- ALTER TABLE buildings_full_merge_scanning
-- ADD COLUMN IF NOT EXISTS geog geography(Point, 4326);
--
-- -- Populate geography column from lat/lng
-- UPDATE buildings_full_merge_scanning
-- SET geog = ST_SetSRID(ST_MakePoint(geocoded_lng, geocoded_lat), 4326)::geography
-- WHERE geocoded_lat IS NOT NULL AND geocoded_lng IS NOT NULL;
--
-- -- Create spatial index
-- CREATE INDEX IF NOT EXISTS idx_buildings_geog
-- ON buildings_full_merge_scanning USING GIST(geog);

-- Check index usage
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE tablename = 'buildings_full_merge_scanning'
-- ORDER BY idx_scan DESC;
