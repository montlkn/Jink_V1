-- Migration: Create quest_events table for tracking quest progress
-- Purpose: Enable proper verification of quest completion (no duplicate building counts)
-- Date: 2024-12-11

-- Create quest_events table
CREATE TABLE IF NOT EXISTS quest_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'scan', 'walk', 'contribution', 'photo'
  building_bbl TEXT,
  neighborhood TEXT,
  style TEXT,
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_quest_events_user_quest ON quest_events(user_id, quest_id);
CREATE INDEX IF NOT EXISTS idx_quest_events_timestamp ON quest_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_quest_events_building ON quest_events(building_bbl) WHERE building_bbl IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE quest_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see and insert their own quest events
CREATE POLICY quest_events_user_policy ON quest_events
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE quest_events IS 'Tracks individual events that contribute to quest progress';
COMMENT ON COLUMN quest_events.event_type IS 'Type of event: scan, walk, contribution, photo';
COMMENT ON COLUMN quest_events.building_bbl IS 'Building identifier (BBL) if applicable';
COMMENT ON COLUMN quest_events.neighborhood IS 'Neighborhood name for neighborhood-based quests';
COMMENT ON COLUMN quest_events.style IS 'Architectural style for style-based quests';
COMMENT ON COLUMN quest_events.metadata IS 'Additional event data (walk duration, photo count, etc.)';
