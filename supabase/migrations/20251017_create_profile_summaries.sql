-- Profile summaries table for AI-generated aesthetic descriptions
CREATE TABLE IF NOT EXISTS profile_summaries (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  text TEXT NOT NULL,
  key_phrases TEXT[] NOT NULL DEFAULT '{}',
  language TEXT NOT NULL DEFAULT 'en',
  tone TEXT NOT NULL DEFAULT 'neutral',
  source_model TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL,
  baseline_version INT NOT NULL,
  baseline_breakdown JSONB NOT NULL,
  baseline_hash TEXT NOT NULL,
  needs_update BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Aesthetic snapshots table for audit trail
CREATE TABLE IF NOT EXISTS aesthetic_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_at TIMESTAMPTZ NOT NULL,
  breakdown JSONB NOT NULL,
  sum_before_normalize NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profile_summaries_user_id ON profile_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_summaries_needs_update ON profile_summaries(needs_update);
CREATE INDEX IF NOT EXISTS idx_aesthetic_snapshots_user_id ON aesthetic_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_aesthetic_snapshots_snapshot_at ON aesthetic_snapshots(snapshot_at DESC);

-- Enable RLS
ALTER TABLE profile_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE aesthetic_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own summaries
CREATE POLICY "Users can view own summary" ON profile_summaries
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert/update summaries" ON profile_summaries
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "System can update own summaries" ON profile_summaries
  FOR UPDATE USING (user_id = auth.uid());

-- RLS Policy: Users can view own snapshots
CREATE POLICY "Users can view own snapshots" ON aesthetic_snapshots
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert snapshots" ON aesthetic_snapshots
  FOR INSERT WITH CHECK (TRUE);
