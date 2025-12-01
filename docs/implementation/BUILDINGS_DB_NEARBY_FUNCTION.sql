-- Create RPC function for fast nearby building queries
-- Run this on the Buildings Supabase instance (NOT the App DB)
-- This uses PostGIS for efficient spatial queries

-- 1. Enable PostGIS extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Create geography column for spatial indexing
ALTER TABLE buildings_full_merge_scanning
ADD COLUMN IF NOT EXISTS geog geography(Point, 4326);

-- 3. Populate geography column from existing lat/lng data (cast TEXT to DOUBLE PRECISION)
UPDATE buildings_full_merge_scanning
SET geog = ST_SetSRID(
    ST_MakePoint(
        geocoded_lng::DOUBLE PRECISION,
        geocoded_lat::DOUBLE PRECISION
    ),
    4326
)::geography
WHERE geocoded_lat IS NOT NULL
  AND geocoded_lng IS NOT NULL
  AND geocoded_lat ~ '^-?[0-9]+\.?[0-9]*$'  -- Valid numeric format
  AND geocoded_lng ~ '^-?[0-9]+\.?[0-9]*$'  -- Valid numeric format
  AND geog IS NULL;

-- 4. Create spatial index (GIST) for fast distance queries
CREATE INDEX IF NOT EXISTS idx_buildings_geog
ON buildings_full_merge_scanning USING GIST(geog);

-- 5. Create RPC function for nearby building queries
CREATE OR REPLACE FUNCTION nearby_buildings(
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    radius_km DOUBLE PRECISION DEFAULT 1.0,
    max_results INTEGER DEFAULT 150
)
RETURNS TABLE (
    bin TEXT,
    building_name TEXT,
    address TEXT,
    architect TEXT,
    style TEXT,
    year_built TEXT,
    geocoded_lat TEXT,
    geocoded_lng TEXT,
    distance_km DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        b.bin,
        b.building_name,
        b.address,
        b.architect,
        b.style,
        b.year_built,
        b.geocoded_lat,
        b.geocoded_lng,
        (ST_Distance(
            b.geog,
            ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
        ) / 1000.0) AS distance_km
    FROM buildings_full_merge_scanning b
    WHERE b.geog IS NOT NULL
      AND ST_DWithin(
          b.geog,
          ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
          radius_km * 1000  -- Convert km to meters
      )
    ORDER BY b.geog <-> ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql STABLE;

-- 6. Test the function
-- SELECT * FROM nearby_buildings(40.7484, -73.9857, 1.0, 50);

-- 7. Grant access to anon role (for public API access)
GRANT EXECUTE ON FUNCTION nearby_buildings(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION nearby_buildings(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) TO authenticated;
