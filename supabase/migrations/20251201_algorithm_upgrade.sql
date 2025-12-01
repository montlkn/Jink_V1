-- Migration: Algorithm Upgrade (Logarithmic Decay + Advanced Confidence)
-- Adds fields to support new algorithm features

-- 1. Enhance user_aesthetic_profiles table
ALTER TABLE user_aesthetic_profiles
  ADD COLUMN IF NOT EXISTS action_diversity INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS entropy NUMERIC,
  ADD COLUMN IF NOT EXISTS confidence_components JSONB,
  ADD COLUMN IF NOT EXISTS last_decay_days NUMERIC;

-- Add comment explaining new fields
COMMENT ON COLUMN user_aesthetic_profiles.action_diversity IS 'Count of distinct action types (for diversity bonus in confidence)';
COMMENT ON COLUMN user_aesthetic_profiles.entropy IS 'Profile entropy (0 to ln(9) ≈ 2.197) for consistency bonus';
COMMENT ON COLUMN user_aesthetic_profiles.confidence_components IS 'Breakdown: {base, diversity, consistency}';
COMMENT ON COLUMN user_aesthetic_profiles.last_decay_days IS 'Days since last decay was applied (for logging)';

-- 2. Enhance user_aesthetic_events table
ALTER TABLE user_aesthetic_events
  ADD COLUMN IF NOT EXISTS contextual_weight NUMERIC DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS sequence_bonus NUMERIC DEFAULT 0;

COMMENT ON COLUMN user_aesthetic_events.contextual_weight IS 'Contextual weight multiplier (surprise factor * significance boost)';
COMMENT ON COLUMN user_aesthetic_events.sequence_bonus IS 'Bonus for scanning same style repeatedly (+1.5 for 3+, +5.0 for 10+)';

-- 3. Create session tracking table for sequence bonuses
CREATE TABLE IF NOT EXISTS user_session_tracking (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  session_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  style_counts JSONB NOT NULL DEFAULT '{}',
  last_event_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient session lookups
CREATE INDEX IF NOT EXISTS idx_session_tracking_user
  ON user_session_tracking(user_id, session_start);

COMMENT ON TABLE user_session_tracking IS 'Tracks style scan patterns within 90-min sessions for sequence bonuses';
COMMENT ON COLUMN user_session_tracking.style_counts IS 'Map of style -> count, e.g., {"art-deco": 3, "modernist": 1}';

-- 4. Enable RLS on session tracking
ALTER TABLE user_session_tracking ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can only see their own session data
CREATE POLICY "Users can view own session data"
  ON user_session_tracking
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own session data"
  ON user_session_tracking
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own session data"
  ON user_session_tracking
  FOR UPDATE
  USING (auth.uid() = user_id);

-- 5. Add building significance score if missing (for contextual weighting)
ALTER TABLE buildings_full_merge_scanning
  ADD COLUMN IF NOT EXISTS significance_score INT CHECK (significance_score >= 0 AND significance_score <= 100);

COMMENT ON COLUMN buildings_full_merge_scanning.significance_score IS 'Architectural significance (0-100) for contextual weighting';
