-- Add Chrysler Building listings (correct BIN: 1036156)

-- First delete old incorrect BIN listings if they exist
DELETE FROM listing_photos WHERE listing_id IN (
  SELECT id FROM property_listings WHERE bin = '1004110'
);
DELETE FROM property_listings WHERE bin = '1004110';

-- Add Chrysler Building listings with correct BIN
INSERT INTO property_listings (
  id, bin, agent_id, listing_type, status, bedrooms, bathrooms, square_feet,
  price_amount, price_display, unit_number, title, description,
  source, is_premium, listed_at
)
VALUES
  (
    '20000000-0000-0000-0000-000000000001',
    '1036156',
    '00000000-0000-0000-0000-000000000001',
    'sale',
    'active',
    3,
    3.0,
    2200,
    650000000,
    '$6,500,000',
    '60A',
    'Iconic Art Deco Penthouse',
    'Rare opportunity to own a piece of NYC history. This spectacular 3-bedroom residence offers unparalleled views and timeless elegance.',
    'agent',
    true,
    NOW()
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '1036156',
    NULL,
    'rent',
    'active',
    2,
    2.0,
    1400,
    550000,
    '$5,500/mo',
    '45F',
    NULL,
    NULL,
    'zillow',
    false,
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  bin = EXCLUDED.bin,
  bedrooms = EXCLUDED.bedrooms,
  bathrooms = EXCLUDED.bathrooms,
  square_feet = EXCLUDED.square_feet,
  price_amount = EXCLUDED.price_amount,
  price_display = EXCLUDED.price_display,
  unit_number = EXCLUDED.unit_number,
  title = EXCLUDED.title,
  description = EXCLUDED.description;

-- Add photos for Chrysler premium listing
INSERT INTO listing_photos (listing_id, photo_url, photo_order, is_primary)
VALUES
  ('20000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1560184897-ae75f418493e?w=800', 0, true),
  ('20000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800', 1, false)
ON CONFLICT DO NOTHING;

-- Verify the listings were added
SELECT
  pl.bin,
  pl.unit_number,
  pl.price_display,
  pl.bedrooms,
  pl.bathrooms,
  pl.is_premium,
  COUNT(lp.id) as photo_count
FROM property_listings pl
LEFT JOIN listing_photos lp ON pl.id = lp.listing_id
WHERE pl.bin = '1036156'
GROUP BY pl.id, pl.bin, pl.unit_number, pl.price_display, pl.bedrooms, pl.bathrooms, pl.is_premium;
