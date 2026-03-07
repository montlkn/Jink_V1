-- Sample listings for testing
-- Using a common NYC building BIN for demo

-- First, let's create a test agent
INSERT INTO listing_agents (id, agent_name, agency_name, email, phone, subscription_status, subscription_tier)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Jane Smith', 'NYC Realty Group', 'jane@nycrealty.com', '(212) 555-0100', 'active', 'premium')
ON CONFLICT (id) DO NOTHING;

-- Sample listings for Empire State Building (BIN: 1001389)
INSERT INTO property_listings (
  id, bin, agent_id, listing_type, status, bedrooms, bathrooms, square_feet, 
  price_amount, price_display, unit_number, title, description, 
  source, is_premium, listed_at
)
VALUES
  -- Premium listing
  (
    '10000000-0000-0000-0000-000000000001',
    '1001389',
    '00000000-0000-0000-0000-000000000001',
    'sale',
    'active',
    2,
    2.0,
    1200,
    250000000,
    '$2,500,000',
    '42A',
    'Luxury 2BR with Empire State Views',
    'Stunning corner unit with floor-to-ceiling windows overlooking Manhattan. Completely renovated with high-end finishes.',
    'agent',
    true,
    NOW()
  ),
  -- Free listing 1
  (
    '10000000-0000-0000-0000-000000000002',
    '1001389',
    NULL,
    'rent',
    'active',
    1,
    1.0,
    800,
    350000,
    '$3,500/mo',
    '28C',
    NULL,
    NULL,
    'zillow',
    false,
    NOW()
  ),
  -- Free listing 2
  (
    '10000000-0000-0000-0000-000000000003',
    '1001389',
    NULL,
    'sale',
    'active',
    3,
    2.5,
    1800,
    400000000,
    '$4,000,000',
    '55B',
    NULL,
    NULL,
    'streeteasy',
    false,
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- Add photos for the premium listing
INSERT INTO listing_photos (listing_id, photo_url, photo_order, is_primary)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', 0, true),
  ('10000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800', 1, false),
  ('10000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800', 2, false)
ON CONFLICT DO NOTHING;

-- Sample listings for Chrysler Building (BIN: 1004110)
INSERT INTO property_listings (
  id, bin, agent_id, listing_type, status, bedrooms, bathrooms, square_feet, 
  price_amount, price_display, unit_number, title, description, 
  source, is_premium, listed_at
)
VALUES
  -- Premium listing
  (
    '20000000-0000-0000-0000-000000000001',
    '1004110',
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
  -- Free listing
  (
    '20000000-0000-0000-0000-000000000002',
    '1004110',
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
ON CONFLICT (id) DO NOTHING;

-- Add photos for Chrysler premium listing
INSERT INTO listing_photos (listing_id, photo_url, photo_order, is_primary)
VALUES
  ('20000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1560184897-ae75f418493e?w=800', 0, true),
  ('20000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800', 1, false)
ON CONFLICT DO NOTHING;
