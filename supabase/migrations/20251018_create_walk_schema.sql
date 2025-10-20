-- Create the modern walk schema with normalized tables

-- Enable PostGIS extension for geometry support
CREATE EXTENSION IF NOT EXISTS postgis;

-- Drop the old walks table if it exists (we'll replace it)
DROP TABLE IF EXISTS walks;

-- Create walk_summaries table (replaces the old walks table)
CREATE TABLE IF NOT EXISTS walk_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  distance_km NUMERIC,
  borough TEXT,
  origin_lat NUMERIC,
  origin_lng NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create walk_points table for GPS track points
CREATE TABLE IF NOT EXISTS walk_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  walk_id UUID NOT NULL REFERENCES walk_summaries(id) ON DELETE CASCADE,
  lat NUMERIC NOT NULL,
  lng NUMERIC NOT NULL,
  seq INTEGER NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  hdop NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create walk_seen_points table for discovered buildings
CREATE TABLE IF NOT EXISTS walk_seen_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  walk_id UUID NOT NULL REFERENCES walk_summaries(id) ON DELETE CASCADE,
  building_id INTEGER,
  lat NUMERIC NOT NULL,
  lng NUMERIC NOT NULL,
  confidence NUMERIC,
  stamp_awarded BOOLEAN DEFAULT FALSE,
  scanned BOOLEAN DEFAULT FALSE,
  source TEXT,
  place_id TEXT,
  address TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create walk_optimized_locations table for route optimization
CREATE TABLE IF NOT EXISTS walk_optimized_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  walk_id UUID NOT NULL REFERENCES walk_summaries(id) ON DELETE CASCADE,
  geom GEOMETRY(POINT, 4326),
  walk_score NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_walk_summaries_user_id ON walk_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_walk_summaries_started_at ON walk_summaries(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_walk_points_walk_id ON walk_points(walk_id);
CREATE INDEX IF NOT EXISTS idx_walk_points_seq ON walk_points(walk_id, seq);
CREATE INDEX IF NOT EXISTS idx_walk_seen_points_walk_id ON walk_seen_points(walk_id);
CREATE INDEX IF NOT EXISTS idx_walk_seen_points_building_id ON walk_seen_points(building_id);
CREATE INDEX IF NOT EXISTS idx_walk_optimized_locations_walk_id ON walk_optimized_locations(walk_id);

-- Enable RLS on all tables
ALTER TABLE walk_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE walk_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE walk_seen_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE walk_optimized_locations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for walk_summaries
CREATE POLICY "Users can view own walk summaries" ON walk_summaries
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own walk summaries" ON walk_summaries
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own walk summaries" ON walk_summaries
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own walk summaries" ON walk_summaries
  FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for walk_points
CREATE POLICY "Users can view own walk points" ON walk_points
  FOR SELECT USING (walk_id IN (
    SELECT id FROM walk_summaries WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own walk points" ON walk_points
  FOR INSERT WITH CHECK (walk_id IN (
    SELECT id FROM walk_summaries WHERE user_id = auth.uid()
  ));

-- RLS Policies for walk_seen_points
CREATE POLICY "Users can view own walk seen points" ON walk_seen_points
  FOR SELECT USING (walk_id IN (
    SELECT id FROM walk_summaries WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own walk seen points" ON walk_seen_points
  FOR INSERT WITH CHECK (walk_id IN (
    SELECT id FROM walk_summaries WHERE user_id = auth.uid()
  ));

-- RLS Policies for walk_optimized_locations
CREATE POLICY "Users can view own walk optimized locations" ON walk_optimized_locations
  FOR SELECT USING (walk_id IN (
    SELECT id FROM walk_summaries WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own walk optimized locations" ON walk_optimized_locations
  FOR INSERT WITH CHECK (walk_id IN (
    SELECT id FROM walk_summaries WHERE user_id = auth.uid()
  ));
