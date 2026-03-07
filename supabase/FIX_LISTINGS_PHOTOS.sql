-- Remove photos from non-premium listings (Unit 45F is free, shouldn't have photos)
DELETE FROM listing_photos
WHERE listing_id IN (
  SELECT id FROM property_listings WHERE is_premium = false
);

-- Verify only premium listings have photos
SELECT
  pl.bin,
  pl.unit_number,
  pl.is_premium,
  COUNT(lp.id) as photo_count
FROM property_listings pl
LEFT JOIN listing_photos lp ON pl.id = lp.listing_id
WHERE pl.bin = '1036156'
GROUP BY pl.id, pl.bin, pl.unit_number, pl.is_premium;
