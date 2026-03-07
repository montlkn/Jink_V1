-- Real Estate Listings Schema
-- Supports free public listings (Zillow/StreetEasy teasers) and premium agent placements.

-- ============================================================
-- listing_agents — agents who pay for premium placement
-- ============================================================
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

-- ============================================================
-- property_listings — individual listings tied to buildings by BIN
-- ============================================================
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

-- ============================================================
-- listing_photos
-- ============================================================
CREATE TABLE IF NOT EXISTS listing_photos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  UUID NOT NULL REFERENCES property_listings(id) ON DELETE CASCADE,
  photo_url   TEXT NOT NULL,
  photo_order SMALLINT NOT NULL DEFAULT 0,
  is_primary  BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_listing_photos_listing ON listing_photos(listing_id);

-- ============================================================
-- listing_analytics — impression / click / contact tracking
-- ============================================================
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

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE listing_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_analytics ENABLE ROW LEVEL SECURITY;

-- Listings readable by all authenticated users
CREATE POLICY "Listings are viewable by authenticated users"
  ON property_listings FOR SELECT
  TO authenticated
  USING (true);

-- Listings writable by owning agent
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
CREATE POLICY "Listing photos are viewable by authenticated users"
  ON listing_photos FOR SELECT
  TO authenticated
  USING (true);

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
CREATE POLICY "Authenticated users can log analytics"
  ON listing_analytics FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Agents can view their own profile
CREATE POLICY "Agents can view their own profile"
  ON listing_agents FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Agents can update their own profile"
  ON listing_agents FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- listing_applications — tour requests from users
-- ============================================================
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

ALTER TABLE listing_applications ENABLE ROW LEVEL SECURITY;

-- Users can insert their own applications
CREATE POLICY "Users can submit tour applications"
  ON listing_applications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can view their own applications
CREATE POLICY "Users can view their own applications"
  ON listing_applications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Agents can view applications for their listings
CREATE POLICY "Agents can view applications for their listings"
  ON listing_applications FOR SELECT
  TO authenticated
  USING (
    agent_id IN (SELECT id FROM listing_agents WHERE user_id = auth.uid())
  );
