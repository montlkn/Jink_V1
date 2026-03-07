-- Quick check to see what listings exist in the database

-- 1. Check all listings
SELECT
  pl.bin,
  pl.unit_number,
  pl.listing_type,
  pl.price_display,
  pl.is_premium,
  pl.status,
  la.agent_name
FROM property_listings pl
LEFT JOIN listing_agents la ON pl.agent_id = la.id
ORDER BY pl.bin, pl.created_at DESC;

-- 2. Check specifically for Chrysler Building
SELECT * FROM property_listings WHERE bin = '1004110';

-- 3. Check all BINs that have listings
SELECT DISTINCT bin, COUNT(*) as listing_count
FROM property_listings
GROUP BY bin
ORDER BY bin;

-- 4. Check if the table exists and has any data at all
SELECT COUNT(*) as total_listings FROM property_listings;
