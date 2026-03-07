-- ============================================================
-- APPLY ALL LISTINGS MIGRATIONS
-- Run this in Supabase SQL Editor (Main Supabase, not Buildings)
-- ============================================================

-- ============================================================
-- 1. Fix aesthetic event types constraint
-- ============================================================

ALTER TABLE user_aesthetic_events DROP CONSTRAINT IF EXISTS valid_event_type;

ALTER TABLE user_aesthetic_events ADD CONSTRAINT valid_event_type CHECK (event_type IN (
  -- Original event types
  'quiz_answer', 'building_scan', 'building_like', 'building_save',
  'building_unlike', 'add_note', 'route_complete', 'detail_view',
  'quick_dismiss', 'dwell_time_15s', 'dwell_time_30s', 'dwell_time_60s+',
  -- New event types for recommendation algorithm
  'like', 'unlike', 'dislike',
  'dwell_15', 'dwell_30', 'dwell_60'
));

-- ============================================================
-- 2. Create listings tables
-- ============================================================

-- listing_agents — agents who pay for premium placement
CREATE TABLE IF NOT EXISTS listing_agents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  agent_name    TEXT NOT NULL,
  agency_name   TEXT,
  email         TEXT NOT NULL,
  phone         TEXT,
  profile_photo_url TEXT,
  subscription_status TEXT NOT NULL DEFAULT 'inactive'
    CHECK (subscription_status IN ('active', 'inactive', 'trial', 'cancelled')),
  subscription_tier TEXT DEFAULT 'basic'
    CHECK (subscription_tier IN ('basic', 'pro', 'premium')),
  subscription_expires_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_agents_user_id ON listing_agents(user_id);

-- property_listings — individual listings tied to buildings by BIN
CREATE TABLE IF NOT EXISTS property_listings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bin               TEXT NOT NULL,               -- links to nyc_buildings.bin
  agent_id          UUID REFERENCES listing_agents(id) ON DELETE SET NULL,
  listing_type      TEXT NOT NULL DEFAULT 'sale'
    CHECK (listing_type IN ('sale', 'rent')),
  status            TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'pending', 'sold', 'rented', 'expired')),
  bedrooms          SMALLINT,
  bathrooms         NUMERIC(3,1),
  square_feet       INTEGER,
  price_amount      BIGINT,                      -- cents for precision
  price_display     TEXT,                         -- e.g. "$1,200,000" or "$3,500/mo"
  unit_number       TEXT,
  title             TEXT,
  description       TEXT,
  source            TEXT NOT NULL DEFAULT 'agent'
    CHECK (source IN ('zillow', 'streeteasy', 'agent', 'manual')),
  source_url        TEXT,
  source_listing_id TEXT,
  is_premium        BOOLEAN NOT NULL DEFAULT false,
  listed_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_listings_bin ON property_listings(bin);
CREATE INDEX IF NOT EXISTS idx_property_listings_agent ON property_listings(agent_id);
CREATE INDEX IF NOT EXISTS idx_property_listings_status ON property_listings(status) WHERE status = 'active';

-- listing_photos
CREATE TABLE IF NOT EXISTS listing_photos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  UUID NOT NULL REFERENCES property_listings(id) ON DELETE CASCADE,
  photo_url   TEXT NOT NULL,
  photo_order SMALLINT NOT NULL DEFAULT 0,
  is_primary  BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_listing_photos_listing ON listing_photos(listing_id);

-- listing_analytics — impression / click / contact tracking
CREATE TABLE IF NOT EXISTS listing_analytics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  UUID NOT NULL REFERENCES property_listings(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type  TEXT NOT NULL
    CHECK (event_type IN ('impression', 'click', 'contact', 'share')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_analytics_listing ON listing_analytics(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_analytics_created ON listing_analytics(created_at);

-- listing_applications — tour requests from users
CREATE TABLE IF NOT EXISTS listing_applications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id    UUID NOT NULL REFERENCES property_listings(id) ON DELETE CASCADE,
  agent_id      UUID REFERENCES listing_agents(id) ON DELETE SET NULL,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  applicant_name TEXT NOT NULL,
  applicant_email TEXT NOT NULL,
  applicant_phone TEXT,
  tour_type      TEXT CHECK (tour_type IN ('in_person', 'virtual', 'open_house')),
  preferred_date DATE,
  preferred_time TEXT,
  message        TEXT,
  status         TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'reviewed', 'scheduled', 'declined')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_applications_listing ON listing_applications(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_applications_agent ON listing_applications(agent_id);
CREATE INDEX IF NOT EXISTS idx_listing_applications_user ON listing_applications(user_id);

-- ============================================================
-- 3. Row Level Security
-- ============================================================

ALTER TABLE listing_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_applications ENABLE ROW LEVEL SECURITY;

-- Listings readable by all authenticated users
DROP POLICY IF EXISTS "Listings are viewable by authenticated users" ON property_listings;
CREATE POLICY "Listings are viewable by authenticated users"
  ON property_listings FOR SELECT
  TO authenticated
  USING (true);

-- Listings writable by owning agent
DROP POLICY IF EXISTS "Agents can manage their own listings" ON property_listings;
CREATE POLICY "Agents can manage their own listings"
  ON property_listings FOR ALL
  TO authenticated
  USING (
    agent_id IN (SELECT id FROM listing_agents WHERE user_id = auth.uid())
  )
  WITH CHECK (
    agent_id IN (SELECT id FROM listing_agents WHERE user_id = auth.uid())
  );

-- Photos readable by all, writable by listing owner
DROP POLICY IF EXISTS "Listing photos are viewable by authenticated users" ON listing_photos;
CREATE POLICY "Listing photos are viewable by authenticated users"
  ON listing_photos FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Agents can manage photos for their listings" ON listing_photos;
CREATE POLICY "Agents can manage photos for their listings"
  ON listing_photos FOR ALL
  TO authenticated
  USING (
    listing_id IN (
      SELECT pl.id FROM property_listings pl
      JOIN listing_agents la ON pl.agent_id = la.id
      WHERE la.user_id = auth.uid()
    )
  )
  WITH CHECK (
    listing_id IN (
      SELECT pl.id FROM property_listings pl
      JOIN listing_agents la ON pl.agent_id = la.id
      WHERE la.user_id = auth.uid()
    )
  );

-- Analytics: anyone can insert, only admins can read (via service role)
DROP POLICY IF EXISTS "Authenticated users can log analytics" ON listing_analytics;
CREATE POLICY "Authenticated users can log analytics"
  ON listing_analytics FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Agents can view their own profile
DROP POLICY IF EXISTS "Agents can view their own profile" ON listing_agents;
CREATE POLICY "Agents can view their own profile"
  ON listing_agents FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Agents can update their own profile" ON listing_agents;
CREATE POLICY "Agents can update their own profile"
  ON listing_agents FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can insert their own applications
DROP POLICY IF EXISTS "Users can submit tour applications" ON listing_applications;
CREATE POLICY "Users can submit tour applications"
  ON listing_applications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can view their own applications
DROP POLICY IF EXISTS "Users can view their own applications" ON listing_applications;
CREATE POLICY "Users can view their own applications"
  ON listing_applications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Agents can view applications for their listings
DROP POLICY IF EXISTS "Agents can view applications for their listings" ON listing_applications;
CREATE POLICY "Agents can view applications for their listings"
  ON listing_applications FOR SELECT
  TO authenticated
  USING (
    agent_id IN (SELECT id FROM listing_agents WHERE user_id = auth.uid())
  );

-- ============================================================
-- 4. Sample data (for testing)
-- ============================================================

-- Create test agent
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

-- Sample listings for Chrysler Building (BIN: 1036156)
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
ON CONFLICT (id) DO NOTHING;

-- Add photos for Chrysler premium listing
INSERT INTO listing_photos (listing_id, photo_url, photo_order, is_primary)
VALUES
  ('20000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1560184897-ae75f418493e?w=800', 0, true),
  ('20000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800', 1, false)
ON CONFLICT DO NOTHING;
